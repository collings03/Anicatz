"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AVATARS, avatarSrc } from "@/lib/avatar";

// Uses NEXT_PUBLIC_API_URL when set. Otherwise: the deployed backend in production, localhost in dev.
const API = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "https://anicatz-7v6u.vercel.app/api" : "http://localhost:8000/api")
).replace(/\/+$/, "");
const API_ORIGIN = (() => {
  try {
    return new URL(API).origin;
  } catch {
    return "";
  }
})();

export type Profile = { username: string; email: string; avatar: string | null };
type Msg = { type: "ok" | "err"; text: string } | null;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const PROFILE_CACHE_KEY = "anicatz_profile";

export const authHeaders = (): Record<string, string> => {
  const t = localStorage.getItem("anicatz_access");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/** Last known profile, kept in the browser so the picture shows instantly (and survives a slow or failed request). */
export const cachedProfile = (): Profile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
};

export const cacheProfile = (p: Profile | null) => {
  try {
    if (p) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // storage full or blocked: ignore
  }
};

/**
 * Turns whatever the backend sends as "avatar" into an image address:
 *  - "preset:lime"  -> a built-in avatar (drawn in code)
 *  - "/media/..."   -> an uploaded photo on the backend
 *  - "https://..."  -> used as is
 */
export const absUrl = (u: string | null) => {
  if (!u) return null;
  if (u.startsWith("preset:")) return avatarSrc(u.slice(7)) || null;
  return u.startsWith("/") ? `${API_ORIGIN}${u}` : u;
};

/** Stable "random-looking" avatar for a name, so the same user always gets the same one. */
export const fallbackAvatarId = (seed: string) => {
  if (!AVATARS.length) return "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length].id;
};

/** Avatar image for a profile: the saved one, or the stable default if none is saved yet. */
export const profileAvatarSrc = (p: Profile | null) => {
  if (!p) return null;
  if (p.avatar) return absUrl(p.avatar);
  const id = fallbackAvatarId(p.email || p.username);
  return id ? avatarSrc(id) || null : null;
};

/**
 * Loads the logged-in user's profile and caches it. Returns null when nobody is logged in
 * or the token was rejected. If the server is unreachable it returns the last known profile.
 */
export async function fetchProfile(): Promise<Profile | null> {
  const headers = authHeaders();
  if (!headers.Authorization) {
    cacheProfile(null); // logged out: drop the previous user's cached profile
    return null;
  }
  try {
    const r = await fetch(`${API}/auth/profile/`, { headers });
    if (r.status === 401) {
      cacheProfile(null);
      return null;
    }
    if (!r.ok) return cachedProfile();
    const p = (await r.json()) as Profile;
    cacheProfile(p);
    return p;
  } catch {
    return cachedProfile();
  }
}

/**
 * Use this in the navbar (and anywhere else that shows the avatar).
 * It shows the cached profile immediately, then refreshes from the server.
 * After login or logout, call `window.dispatchEvent(new Event("anicatz-auth"))` so it reloads.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    // Only trust the cache while a token exists, so a logged-out visitor never sees an old picture.
    setProfile(localStorage.getItem("anicatz_access") ? cachedProfile() : null);
    const load = () => {
      fetchProfile().then((p) => {
        if (alive) setProfile(p);
      });
    };
    load();
    window.addEventListener("anicatz-auth", load);
    window.addEventListener("storage", load);
    return () => {
      alive = false;
      window.removeEventListener("anicatz-auth", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const update = useCallback((p: Profile) => {
    cacheProfile(p);
    setProfile(p);
  }, []);

  return { profile, setProfile: update };
}

// Remembers who we already tried this page load, so the request is never repeated in a loop.
const autoAssigned = new Set<string>();

/**
 * If the logged-in user has no avatar, save the stable default one on the account (ONCE).
 * It is the same picture the app already shows as a fallback, so it never changes between logins.
 */
export function useAutoAvatar(profile: Profile | null, onUpdate: (p: Profile) => void) {
  useEffect(() => {
    if (!profile || profile.avatar || AVATARS.length === 0) return;
    const key = profile.email || profile.username;
    if (autoAssigned.has(key)) return;
    const headers = authHeaders();
    if (!headers.Authorization) return; // not logged in
    autoAssigned.add(key);

    const fd = new FormData();
    fd.set("avatar_preset", fallbackAvatarId(key));

    fetch(`${API}/auth/profile/`, { method: "PATCH", headers, body: fd })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          cacheProfile(data as Profile);
          onUpdate(data as Profile);
        }
      })
      .catch(() => {
        // ignore: the stable default avatar is still shown
      });
  }, [profile, onUpdate]);
}

const CameraIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const SunIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Avatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} object-cover`} onError={() => setFailed(true)} />;
  }
  return (
    <span className={`${className} grid place-items-center bg-gradient-to-br from-[#c8ff3d] to-[#7c5cff] font-display font-black text-black`}>
      {(name.trim()[0] ?? "U").toUpperCase()}
    </span>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-teal-400";

export default function ProfileSettings({
  profile,
  onUpdate,
  theme,
  onToggleTheme,
  page = false,
}: {
  profile: Profile | null;
  onUpdate: (p: Profile) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  /** true = full-page mode (used by /profile): always expanded, no accordion header, no card wrapper. */
  page?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Give users without an avatar their stable default, saved once.
  useAutoAvatar(profile, onUpdate);

  const [open, setOpen] = useState(false);
  const expanded = page || open;
  const [name, setName] = useState(profile?.username ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preset, setPreset] = useState<string | null>(null); // avatar picked in this session, not saved yet
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old: "", next: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // The avatar currently saved on the account, if it is a built-in one.
  const currentPreset = profile?.avatar?.startsWith("preset:") ? profile.avatar.slice(7) : "";

  // Keep the name field in sync when the profile loads or changes.
  useEffect(() => {
    if (profile) setName(profile.username);
  }, [profile]);

  // Free the temporary preview URL.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setMsg({ type: "err", text: "Choose an image file." });
    if (f.size > MAX_AVATAR_BYTES) return setMsg({ type: "err", text: "Image must be under 2 MB." });
    setMsg(null);
    setPreset(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const choosePreset = (id: string) => {
    setMsg(null);
    setFile(null);
    setPreview(null);
    setPreset(id);
  };

  const trimmed = name.trim();
  const presetChanged = preset !== null && preset !== currentPreset;
  const dirty = !!file || presetChanged || (trimmed !== "" && trimmed !== profile?.username);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      if (trimmed && trimmed !== profile?.username) fd.set("username", trimmed);
      if (file) fd.set("avatar", file);
      if (presetChanged) fd.set("avatar_preset", preset as string);
      const r = await fetch(`${API}/auth/profile/`, { method: "PATCH", headers: authHeaders(), body: fd });
      const text = await r.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text);
      } catch {}
      if (!r.ok) {
        const first = (v: unknown) => (Array.isArray(v) ? String(v[0]) : typeof v === "string" ? v : "");
        throw new Error(
          first(data.detail) || first(data.username) || first(data.avatar) || `Could not save changes (HTTP ${r.status}).`
        );
      }
      cacheProfile(data as unknown as Profile);
      onUpdate(data as unknown as Profile);
      setName((data.username as string) ?? name);
      setFile(null);
      setPreview(null);
      setPreset(null);
      setMsg({ type: "ok", text: "Profile updated." });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Could not save changes." });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwBusy) return;
    if (pw.next.length < 8) return setPwMsg({ type: "err", text: "New password needs at least 8 characters." });
    setPwBusy(true);
    setPwMsg(null);
    try {
      const r = await fetch(`${API}/auth/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ old_password: pw.old, new_password: pw.next }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || data?.old_password?.[0] || data?.new_password?.[0] || "Could not change password.");
      setPw({ old: "", next: "" });
      setPwMsg({ type: "ok", text: "Password changed." });
    } catch (e) {
      setPwMsg({ type: "err", text: e instanceof Error ? e.message : "Could not change password." });
    } finally {
      setPwBusy(false);
    }
  };

  // Falls back to the stable default avatar when none is saved yet.
  const shownAvatar = preview ?? (preset ? avatarSrc(preset) : profileAvatarSrc(profile));
  const shownName = profile?.username ?? "A";
  const selectedPreset = file ? "" : (preset ?? currentPreset);

  return (
    <div className={page ? "" : "mb-3 rounded-2xl bg-white/5 p-2"}>
      {/* Header row (dropdown mode only): click to expand the settings */}
      {!page && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl p-1 text-left hover:bg-white/5"
        >
          <Avatar src={profileAvatarSrc(profile)} name={shownName} className="h-11 w-11 shrink-0 rounded-full text-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{profile?.username ?? "Your profile"}</span>
            <span className="block truncate text-xs text-white/50">Profile settings</span>
          </span>
          <ChevronIcon open={open} />
        </button>
      )}

      {expanded && (
        <div className={page ? "" : "px-1 pb-1 pt-3"}>
          {/* Picture */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <Avatar src={shownAvatar} name={shownName} className="h-16 w-16 rounded-full text-2xl" />
              <button
                type="button"
                aria-label="Upload a profile photo"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-teal-400 text-black shadow-lg hover:brightness-110"
              >
                <CameraIcon />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-white/50">{profile?.email}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-xs font-semibold text-teal-400 hover:underline">
                Upload a photo
              </button>
            </div>
          </div>

          {/* Built-in avatars */}
          <p className="mb-2 mt-4 px-1 text-xs font-semibold text-white/50">Or choose an avatar</p>
          <div className="grid grid-cols-4 gap-2.5 px-0.5 sm:grid-cols-6" role="radiogroup" aria-label="Avatar">
            {AVATARS.map((a) => {
              const active = selectedPreset === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => choosePreset(a.id)}
                  className={`aspect-square overflow-hidden rounded-full ring-2 transition ${
                    active ? "scale-105 ring-teal-400" : "ring-white/10 hover:ring-white/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarSrc(a.id)} alt="" className="h-full w-full object-cover" draggable={false} />
                </button>
              );
            })}
          </div>

          {/* Name */}
          <label className="mb-1 mt-4 block px-1 text-xs font-semibold text-white/50" htmlFor="profile-name">
            Display name
          </label>
          <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} className={inputCls} />

          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="mt-3 w-full rounded-xl bg-teal-400 py-2.5 text-sm font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {msg && <p className={`mt-2 px-1 text-xs ${msg.type === "ok" ? "text-teal-400" : "text-red-400"}`} role="status">{msg.text}</p>}

          {/* Appearance */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 px-1 text-xs font-semibold text-white/50">Appearance</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => theme !== t && onToggleTheme()}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                    theme === t ? "bg-teal-400 text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {t === "light" ? <SunIcon /> : <MoonIcon />}
                  {t === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mt-3 border-t border-white/10 pt-2">
            <Link href="/watchlist" className="block rounded-xl px-2 py-2 text-sm text-white/80 hover:bg-white/10">
              My watchlist
            </Link>
            <button
              type="button"
              aria-expanded={pwOpen}
              onClick={() => setPwOpen((v) => !v)}
              className="block w-full rounded-xl px-2 py-2 text-left text-sm text-white/80 hover:bg-white/10"
            >
              Change password
            </button>

            {pwOpen && (
              <div className="mt-2 grid gap-2">
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Current password"
                  aria-label="Current password"
                  value={pw.old}
                  onChange={(e) => setPw({ ...pw, old: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  aria-label="New password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={!pw.old || !pw.next || pwBusy}
                  className="rounded-xl bg-white/10 py-2.5 text-sm font-semibold transition enabled:hover:bg-white/20 disabled:opacity-40"
                >
                  {pwBusy ? "Updating..." : "Update password"}
                </button>
                {pwMsg && <p className={`px-1 text-xs ${pwMsg.type === "ok" ? "text-teal-400" : "text-red-400"}`} role="status">{pwMsg.text}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}