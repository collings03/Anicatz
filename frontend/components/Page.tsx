"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileSettings, { authHeaders, type Profile } from "@/components/Profilemenu";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    // Not logged in: send to the login page.
    if (!localStorage.getItem("anicatz_access")) {
      router.replace("/login");
      return;
    }
    const ctrl = new AbortController();
    setState("loading");
    fetch(`${API}/auth/profile/`, { headers: authHeaders(), signal: ctrl.signal })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((p: Profile | null) => {
        if (!p) return;
        setProfile(p);
        setState("ready");
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setState("error");
      });
    return () => ctrl.abort();
  }, [router, retry]);

  // Tell the navbar about changes so its avatar/theme update without a refresh.
  const onUpdate = (p: Profile) => {
    setProfile(p);
    window.dispatchEvent(new CustomEvent("anicatz-profile", { detail: p }));
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    window.dispatchEvent(new Event("anicatz-theme"));
  };

  const logout = () => {
    localStorage.removeItem("anicatz_access");
    localStorage.removeItem("anicatz_refresh");
    window.dispatchEvent(new Event("anicatz-auth"));
    router.push("/");
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-32 pt-8 md:pb-16 md:pt-28">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
      </div>

      {state === "loading" && <p className="text-sm text-white/50">Loading your profile...</p>}

      {state === "error" && (
        <p className="text-sm text-white/60">
          Couldn&apos;t load your profile.{" "}
          <button className="underline" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}

      {state === "ready" && (
        <>
          <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
            <ProfileSettings page profile={profile} onUpdate={onUpdate} theme={theme} onToggleTheme={toggleTheme} />
          </div>

          <button
            onClick={logout}
            className="mt-4 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold hover:bg-white/20"
          >
            Logout
          </button>
        </>
      )}
    </main>
  );
}