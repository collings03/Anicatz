// frontend/lib/auth.ts
// One place for login tokens: storage, silent refresh, and authenticated requests.
//
// How it stays logged in "full time":
//  - the short-lived ACCESS token is refreshed automatically, before it expires and again if a request gets a 401
//  - every refresh also hands back a NEW refresh token (backend ROTATE_REFRESH_TOKENS), so anyone who uses the
//    site at least once every REFRESH_TOKEN_LIFETIME days is never logged out
//  - a server or network problem never logs you out; only a refresh token the server rejects does

// Uses NEXT_PUBLIC_API_URL when set. Otherwise: the deployed backend in production, localhost in dev.
export const API = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "https://anicatz-7v6u.vercel.app/api" : "http://localhost:8000/api")
).replace(/\/+$/, "");

const ACCESS_KEY = "anicatz_access";
const REFRESH_KEY = "anicatz_refresh";
const PROFILE_KEY = "anicatz_profile";
const SKEW_MS = 60_000; // refresh when less than a minute is left on the access token

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export const getAccess = () => read(ACCESS_KEY);
export const getRefresh = () => read(REFRESH_KEY);

/** True when there is a login to restore (a refresh token is enough, the access token is renewed from it). */
export const isLoggedIn = () => !!getRefresh() || !!getAccess();

const announce = () => window.dispatchEvent(new Event("anicatz-auth"));

/** Call right after a successful login. */
export function setTokens(t: { access: string; refresh?: string }) {
  localStorage.setItem(ACCESS_KEY, t.access);
  if (t.refresh) localStorage.setItem(REFRESH_KEY, t.refresh);
  announce();
}

/** Log out: forgets the tokens and the cached profile on this device. */
export function logout() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch {}
  announce();
}

/** Old-style helper kept so existing `fetch(url, { headers: authHeaders() })` code keeps working. */
export const authHeaders = (): Record<string, string> => {
  const t = getAccess();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/** When the token expires, in ms since epoch (0 if it can't be read). */
function expiresAt(token: string | null): number {
  if (!token) return 0;
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const { exp } = JSON.parse(atob(b64));
    return typeof exp === "number" ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

let refreshing: Promise<boolean> | null = null;

/**
 * Gets a new access token using the refresh token. Many callers at once share ONE request.
 * Resolves true if we now hold a fresh access token.
 */
export function refreshAccess(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refresh = getRefresh();
  if (!refresh) return Promise.resolve(false);

  refreshing = (async () => {
    try {
      const r = await fetch(`${API}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (r.ok) {
        const d = await r.json();
        if (!d?.access) return false;
        localStorage.setItem(ACCESS_KEY, d.access);
        if (d.refresh) localStorage.setItem(REFRESH_KEY, d.refresh); // rotated: slides the session forward
        return true;
      }
      // The server says this refresh token is expired or invalid: that is a real logout.
      if (r.status === 401 || r.status === 400) logout();
      // Anything else (5xx, rate limit) is server trouble: keep the tokens and try again later.
      return false;
    } catch {
      return false; // offline: keep the tokens
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** An access token that is valid for at least another minute (renewed first if needed). */
async function freshAccess(): Promise<string | null> {
  const a = getAccess();
  if ((!a || expiresAt(a) - Date.now() < SKEW_MS) && getRefresh()) {
    await refreshAccess();
    return getAccess();
  }
  return a;
}

/**
 * fetch() that sends the login token. Renews it first when it is about to expire, and if the server
 * still answers 401 it renews once and retries. Use it for every request that needs a logged-in user.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const first = await send(await freshAccess());
  if (first.status !== 401 || !getRefresh()) return first;
  if (!(await refreshAccess())) return first;
  return send(getAccess());
}

/**
 * Keeps the session alive in the background: renews the access token shortly before it expires,
 * when the tab becomes visible again (laptop woke up), when the connection returns, and after login.
 * Returns a function that stops it. Mount once through <AuthKeepAlive />.
 */
export function startKeepAlive(): () => void {
  let timer: number | undefined;

  const schedule = () => {
    window.clearTimeout(timer);
    if (!getRefresh()) return; // logged out: nothing to keep alive
    const left = expiresAt(getAccess()) - Date.now() - SKEW_MS;
    // Wake up just before expiry (and at least every 10 minutes). If a renewal just failed, retry in 30 s.
    const wait = left > 0 ? Math.min(left, 10 * 60_000) : 30_000;
    timer = window.setTimeout(tick, wait);
  };

  const tick = async () => {
    if (!getRefresh()) return window.clearTimeout(timer);
    if (expiresAt(getAccess()) - Date.now() < SKEW_MS) await refreshAccess();
    schedule();
  };

  const wake = () => {
    if (document.visibilityState !== "hidden") tick();
  };

  tick();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);
  window.addEventListener("anicatz-auth", wake);
  window.addEventListener("storage", wake); // another tab logged in, out, or refreshed

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("online", wake);
    window.removeEventListener("anicatz-auth", wake);
    window.removeEventListener("storage", wake);
  };
}