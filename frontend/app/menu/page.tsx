"use client";
// Save as: frontend/app/menu/page.tsx
// Phones only: the profile round in the bottom bar opens this page (desktop keeps the dropdown).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES, GENRES } from "@/lib/categories";
import { Avatar, absUrl, authHeaders, type Profile } from "@/components/Profilemenu";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const row =
  "flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 transition hover:bg-white/10";
const label = "mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/40";

const Chevron = () => (
  <svg className="h-4 w-4 shrink-0 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function MenuPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lang, setLang] = useState<"en" | "jp">("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // The menu page is for phones; on desktop the dropdown is used instead.
    if (window.matchMedia("(min-width: 768px)").matches) {
      router.replace("/");
      return;
    }
    const sync = () => setLoggedIn(!!localStorage.getItem("anicatz_access"));
    const onProfile = (e: Event) => setProfile((e as CustomEvent<Profile>).detail);
    setLang(/(?:^|; )title_lang=jp/.test(document.cookie) ? "jp" : "en");
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    sync();
    setMounted(true);
    window.addEventListener("anicatz-auth", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("anicatz-profile", onProfile);
    return () => {
      window.removeEventListener("anicatz-auth", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("anicatz-profile", onProfile);
    };
  }, [router]);

  // Load name and picture while logged in.
  useEffect(() => {
    if (!loggedIn) {
      setProfile(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${API}/auth/profile/`, { headers: authHeaders(), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProfile)
      .catch(() => {});
    return () => ctrl.abort();
  }, [loggedIn]);

  const setTitleLang = (l: "en" | "jp") => {
    if (l === lang) return;
    document.cookie = `title_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  const chooseTheme = (t: "dark" | "light") => {
    if (t === theme) return;
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {}
    window.dispatchEvent(new Event("anicatz-theme"));
  };

  const logout = () => {
    localStorage.removeItem("anicatz_access");
    localStorage.removeItem("anicatz_refresh");
    window.dispatchEvent(new Event("anicatz-auth"));
    router.push("/");
  };

  if (!mounted) return null;

  const seg = (active: boolean) =>
    `rounded-xl py-2.5 text-sm font-semibold transition ${active ? "bg-teal-400 text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`;

  return (
    <main className="mx-auto w-full max-w-xl overflow-x-clip px-4 pb-32 pt-4">
      <h1 className="mb-4 text-2xl font-semibold">Menu</h1>

      {/* Account */}
      {loggedIn ? (
        <Link href="/profile" className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10">
          <Avatar src={absUrl(profile?.avatar ?? null)} name={profile?.username ?? "A"} className="h-14 w-14 shrink-0 rounded-full text-xl" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{profile?.username ?? "Your profile"}</span>
            <span className="block truncate text-xs text-white/50">{profile?.email ?? "Profile settings"}</span>
          </span>
          <Chevron />
        </Link>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/login" className="rounded-2xl bg-teal-400 py-3 text-center text-sm font-semibold text-black hover:brightness-110">
            Login
          </Link>
          <Link href="/register" className="rounded-2xl bg-white/10 py-3 text-center text-sm font-semibold ring-1 ring-white/10 hover:bg-white/20">
            Register
          </Link>
        </div>
      )}

      {/* Go to */}
      <p className={label}>Go to</p>
      <div className="grid gap-2">
        <Link href="/" className={row}>Home <Chevron /></Link>
        <Link href="/schedule" className={row}>Schedule <Chevron /></Link>
        <Link href="/random" prefetch={false} className={row}>Random <Chevron /></Link>
        {loggedIn && <Link href="/watchlist" className={row}>My watchlist <Chevron /></Link>}
      </div>

      {/* Browse */}
      <p className={label}>Browse</p>
      <div className="grid gap-2">
        {Object.entries(CATEGORIES).map(([slug, c]) => (
          <Link key={slug} href={`/browse/${slug}`} className={row}>
            {c.title} <Chevron />
          </Link>
        ))}
      </div>

      {/* Preferences */}
      <p className={label}>Preferences</p>
      <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="mb-2 px-1 text-xs font-semibold text-white/50">Anime name</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Anime name language">
          <button onClick={() => setTitleLang("en")} aria-pressed={lang === "en"} className={seg(lang === "en")}>English</button>
          <button onClick={() => setTitleLang("jp")} aria-pressed={lang === "jp"} className={seg(lang === "jp")}>Japanese</button>
        </div>

        <p className="mb-2 mt-4 px-1 text-xs font-semibold text-white/50">Appearance</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme">
          <button onClick={() => chooseTheme("dark")} aria-pressed={theme === "dark"} className={seg(theme === "dark")}>Dark</button>
          <button onClick={() => chooseTheme("light")} aria-pressed={theme === "light"} className={seg(theme === "light")}>Light</button>
        </div>
      </div>

      {/* Genres */}
      <p className={label}>Genres</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/genre/${encodeURIComponent(g)}`}
            className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-teal-400 hover:text-black hover:ring-teal-400"
          >
            {g}
          </Link>
        ))}
      </div>

      {loggedIn && (
        <button onClick={logout} className="mt-8 w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/20">
          Logout
        </button>
      )}
    </main>
  );
}