"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORIES, FORMAT_OPTIONS, GENRES, SORT_OPTIONS, STATUS_OPTIONS } from "@/lib/categories";
import { clientLang } from "@/lib/lang";
import ProfileSettings, { Avatar, absUrl, authHeaders, type Profile } from "@/components/Profilemenu";
import { animeSlug, displayTitle, type Anime } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const SearchIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-white/60" {...svg}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const DotsIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const ShuffleIcon = () => (
  <svg className="h-4 w-4" {...svg}>
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
    <path d="m18 14 4 4-4 4" />
  </svg>
);

const SunIcon = () => (
  <svg className="h-4 w-4" {...svg}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" {...svg}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-5 w-5" {...svg}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5" {...svg}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const HomeIcon = () => (
  <svg className="h-5 w-5" {...svg}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" {...svg}>
    <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);

const selectCls =
  "w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-teal-400 [&>option]:bg-neutral-900";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState({ genre: "", format: "", status: "", sort: "popular" });
  const [lang, setLang] = useState<"en" | "jp">("en");
  const [loggedIn, setLoggedIn] = useState(false);
  // Avoids a flash of the Login button for logged-in users before localStorage is read.
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [compact, setCompact] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const searchBox = useRef<HTMLDivElement>(null);
  const menuBox = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close everything after navigating.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    setLang(/(?:^|; )title_lang=jp/.test(document.cookie) ? "jp" : "en");
    const sync = () => setLoggedIn(!!localStorage.getItem("anicatz_access"));
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setMounted(true);
    sync();
    window.addEventListener("anicatz-auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("anicatz-auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Mobile: shrink the bottom bar slightly while scrolling down; restore on scroll up or at the top.
  // Needs a real run of scrolling in one direction before it changes, so small jitters
  // (momentum scroll, the phone's address bar moving, rubber-band bounce) never toggle it.
  useEffect(() => {
    let anchorY = window.scrollY; // where the current run of scrolling started
    let dir = 0; // 1 = down, -1 = up
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (y <= 24) {
          setCompact(false);
          anchorY = y;
          dir = 0;
          return;
        }
        if (y > max) return; // iOS rubber-band at the bottom
        const d = y > anchorY ? 1 : y < anchorY ? -1 : dir;
        if (d !== dir) {
          dir = d;
          anchorY = y;
          return;
        }
        const dist = Math.abs(y - anchorY);
        if (dir === 1 && dist > 28) setCompact(true);
        if (dir === -1 && dist > 14) setCompact(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ctrl+K or "/" focuses search. Esc closes. Clicking outside closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        inputRef.current?.blur();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!searchBox.current?.contains(t)) setSearchOpen(false);
      if (!menuBox.current?.contains(t)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Live search results (debounced).
  useEffect(() => {
    const term = q.trim();
    if (!searchOpen || term.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`${API}/anime/search/?q=${encodeURIComponent(term)}&per_page=6&lang=${clientLang()}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => setResults(d.media ?? []))
        .catch((e) => {
          if (e?.name !== "AbortError") setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, searchOpen]);

  const setTitleLang = (l: "en" | "jp") => {
    if (l === lang) return;
    document.cookie = `title_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  const applyFilter = () => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => v && qs.set(k, v));
    setSearchOpen(false);
    router.push(`/filter?${qs}`);
  };

  const logout = () => {
    localStorage.removeItem("anicatz_access");
    localStorage.removeItem("anicatz_refresh");
    window.dispatchEvent(new Event("anicatz-auth"));
    setMenuOpen(false);
  };

  const item = (href: string) =>
    `block rounded-xl px-3 py-2 text-sm ${pathname === href ? "bg-teal-400 font-semibold text-black" : "text-white/80 hover:bg-white/10"}`;

  const authed = mounted && loggedIn;
  // Stay full size while a menu or the search is open.
  const compactNow = compact && !menuOpen && !searchOpen;

  // Load the profile (for the round avatar) while logged in.
  useEffect(() => {
    if (!authed) {
      setProfile(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${API}/auth/profile/`, { headers: authHeaders(), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProfile)
      .catch(() => {});
    return () => ctrl.abort();
  }, [authed]);

  const showDropdown = searchOpen && (showFilters || q.trim().length >= 2);

  const bar = (
    <header style={{ position: "fixed", left: 0, right: 0, zIndex: 9999 }} className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 w-full max-w-[100vw] px-2 min-[400px]:px-3 md:bottom-auto md:top-3">
      <nav
        className={`liquid-nav mx-auto relative flex w-full min-w-0 max-w-6xl items-center gap-1.5 rounded-full py-1.5 pl-2 pr-1.5 min-[400px]:gap-2 min-[400px]:py-2 min-[400px]:pl-3 min-[400px]:pr-2 md:gap-3 origin-bottom transition-transform duration-300 ease-out motion-reduce:transition-none ${
          compactNow ? "scale-[0.86] md:scale-100" : ""
        }`}
      >
        {/* Logo: Home icon on mobile, logo on desktop */}
        <Link href="/" aria-label="Home" className="flex shrink-0 items-center gap-2">
          {/* Mobile: home icon circle */}
          <span
            className={`grid h-9 w-9 place-items-center rounded-full transition-colors min-[400px]:h-10 min-[400px]:w-10 md:hidden ${
              pathname === "/" ? "liquid-btn-active" : "liquid-btn"
            }`}
          >
            <HomeIcon />
          </span>

          {/* Desktop: original logo */}
          <span className="hidden h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#c8ff3d] to-[#7c5cff] font-display text-lg font-black text-black md:grid">
            A
          </span>
          <span className="hidden font-display text-xl font-bold tracking-tight md:block">
            ani<span className="text-teal-400">catz</span>
          </span>
        </Link>

        {/* Search bar */}
        <div ref={searchBox} className="min-w-0 flex-1 md:relative sm:max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!q.trim()) return;
              setSearchOpen(false);
              router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 ring-1 ring-white/10 focus-within:ring-teal-400 min-[400px]:gap-2 min-[400px]:px-3 md:px-4"
          >
            <span className="hidden min-[400px]:block"><SearchIcon /></span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search..."
              aria-label="Search anime"
              className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-white outline-none placeholder:text-white/40 min-[400px]:py-2.5 min-[400px]:text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setShowFilters((v) => !v);
                setSearchOpen(true);
              }}
              aria-label="Filters"
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold sm:px-3 ${showFilters ? "bg-teal-400 text-black" : "bg-white/10 text-white/80"}`}
            >
              <span className="hidden sm:inline">Filters</span>
              <span className="grid place-items-center sm:hidden"><FilterIcon /></span>
            </button>
          </form>

          {showDropdown && (
            <div className="liquid-panel absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[70vh] overflow-y-auto rounded-2xl md:bottom-auto md:top-full md:mb-0 md:mt-2">
              {showFilters && (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <select aria-label="Genre" value={filter.genre} onChange={(e) => setFilter({ ...filter, genre: e.target.value })} className={selectCls}>
                    <option value="">All genres</option>
                    {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select aria-label="Format" value={filter.format} onChange={(e) => setFilter({ ...filter, format: e.target.value })} className={selectCls}>
                    <option value="">All formats</option>
                    {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select aria-label="Status" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className={selectCls}>
                    <option value="">Any status</option>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select aria-label="Sort by" value={filter.sort} onChange={(e) => setFilter({ ...filter, sort: e.target.value })} className={selectCls}>
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button type="button" onClick={applyFilter} className="rounded-xl bg-teal-400 py-2.5 text-sm font-semibold text-black sm:col-span-2">
                    Apply filters
                  </button>
                </div>
              )}

              {results.length > 0 && (
                <ul className={`max-h-80 divide-y divide-white/5 overflow-y-auto ${showFilters ? "border-t border-white/10" : ""}`}>
                  {results.map((a) => (
                    <li key={a.id}>
                      <Link href={`/anime/${animeSlug(a)}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5">
                        <Image src={a.coverImage.large} alt="" width={40} height={56} className="h-14 w-10 shrink-0 rounded-md object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{displayTitle(a)}</span>
                          <span className="text-xs text-white/50">{[a.format, a.seasonYear].filter(Boolean).join(" • ")}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {loading && <p className="border-t border-white/10 px-4 py-3 text-sm text-white/50">Searching...</p>}
              {q.trim().length >= 2 && !loading && results.length === 0 && (
                <p className="border-t border-white/10 px-4 py-5 text-center text-sm text-white/50">No matches yet.</p>
              )}
              {q.trim().length >= 2 && (
                <p className="border-t border-white/10 px-4 py-2 text-[11px] text-white/40">Press Enter to see all results</p>
              )}
            </div>
          )}
        </div>

        {/* Quick links (desktop only) */}
        <div className="hidden shrink-0 items-center gap-1 md:ml-auto md:flex">
          <Link
            href="/"
            className={`rounded-full px-3 py-2 text-sm transition-colors lg:px-4 ${
              pathname === "/" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            Home
          </Link>
          <Link
            href="/random"
            prefetch={false}
            aria-label="Random"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/70 lg:px-4 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ShuffleIcon /> <span className="hidden lg:inline">Random</span>
          </Link>
          <div
            className="relative ml-1 mr-1 h-9 w-[4.5rem] shrink-0 rounded-full bg-white/10 text-xs font-bold"
            role="group"
            aria-label="Anime name language"
          >
            <span
              className={`absolute inset-y-1 left-0 w-[calc(50%-4px)] rounded-full bg-teal-400 transition-transform duration-300 ${
                lang === "en" ? "translate-x-1" : "translate-x-[calc(100%+4px)]"
              }`}
            />
            <div className="absolute inset-0 flex">
              {(["en", "jp"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setTitleLang(l)}
                  aria-pressed={lang === l}
                  className={`relative z-10 h-full w-1/2 ${lang === l ? "text-black" : "text-white/70"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Light / dark mode (logged out; logged in uses Profile settings) */}
          {!authed && (
            <button
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          )}

          {/* Login button, next to the language toggle (only when logged out) */}
          {mounted && !loggedIn && (
            <Link
              href="/login"
              className="ml-1 rounded-full bg-teal-400 px-3 py-2 text-sm font-semibold lg:px-4 text-black transition hover:brightness-110"
            >
              Login
            </Link>
          )}
        </div>

        {/* Schedule (mobile only; on desktop it lives in the menu) */}
        <Link
          href="/schedule"
          aria-label="Schedule"
          className={`ml-auto grid h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 shrink-0 place-items-center rounded-full transition-colors md:hidden ${
            pathname === "/schedule" ? "liquid-btn-active" : "liquid-btn"
          }`}
        >
          <CalendarIcon />
        </Link>

        {/* Profile / menu button */}
        <div ref={menuBox} className="relative shrink-0">
          <button
            aria-label={authed ? "Profile and menu" : "Menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={`grid h-9 w-9 min-[400px]:h-10 min-[400px]:w-10 place-items-center overflow-hidden rounded-full transition-colors ${
              menuOpen ? "liquid-btn-active" : "liquid-btn"
            } ${authed ? `md:ring-2 ${menuOpen ? "md:ring-teal-400" : "md:ring-white/10 md:hover:ring-white/30"}` : ""}`}
          >
            {/* Mobile: always the profile icon */}
            <span className="md:hidden"><UserIcon /></span>

            {/* Desktop: avatar when logged in, dots when logged out */}
            {authed ? (
              <span className="hidden h-full w-full md:block">
                <Avatar src={absUrl(profile?.avatar ?? null)} name={profile?.username ?? "A"} className="h-full w-full text-lg" />
              </span>
            ) : (
              <span className="hidden md:block"><DotsIcon /></span>
            )}
          </button>

          {menuOpen && (
            <div className="liquid-panel absolute bottom-full right-0 z-50 mb-3 max-h-[70vh] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-[#0e0e16]/95 p-3 shadow-2xl md:bottom-auto md:top-full md:mb-0 md:mt-3">
              {/* Logged in: profile settings (picture, name, password) */}
              {authed && <ProfileSettings profile={profile} onUpdate={setProfile} theme={theme} onToggleTheme={toggleTheme} />}

              {/* Home + Random live in the bar on desktop, so only show them here on small screens */}
              <Link href="/" className={`${item("/")} md:hidden`}>Home</Link>
              <div className="hidden md:block">
                <Link href="/schedule" className={item("/schedule")}>Schedule</Link>
              </div>
              <Link href="/random" prefetch={false} className={`${item("/random")} md:hidden`}>Random</Link>

              <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Browse</p>
              {Object.entries(CATEGORIES).map(([slug, c]) => (
                <Link key={slug} href={`/browse/${slug}`} className={item(`/browse/${slug}`)}>
                  {c.title}
                </Link>
              ))}

              {/* EN/JP lives in the bar on desktop */}
              <div className="mt-3 flex items-center justify-between px-3 py-2 md:hidden">
                <span className="text-sm text-white/80">Anime name</span>
                <div className="relative h-8 w-[4.25rem] rounded-full bg-white/10 text-xs font-bold" role="group" aria-label="Anime name language">
                  <span
                    className={`absolute inset-y-1 left-0 w-[calc(50%-4px)] rounded-full bg-teal-400 transition-transform duration-300 ${
                      lang === "en" ? "translate-x-1" : "translate-x-[calc(100%+4px)]"
                    }`}
                  />
                  <div className="absolute inset-0 flex">
                    {(["en", "jp"] as const).map((l) => (
                      <button key={l} onClick={() => setTitleLang(l)} aria-pressed={lang === l} className={`relative z-10 h-full w-1/2 ${lang === l ? "text-black" : "text-white/70"}`}>
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Theme toggle: in the bar on desktop; logged in users use Profile settings */}
              {!authed && (
                <div className="flex items-center justify-between px-3 py-2 md:hidden">
                  <span className="text-sm text-white/80">{theme === "light" ? "Light mode" : "Dark mode"}</span>
                  <button
                    onClick={toggleTheme}
                    aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
                  >
                    {theme === "light" ? <MoonIcon /> : <SunIcon />}
                  </button>
                </div>
              )}

              <p className="mb-2 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Genres</p>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                {GENRES.map((g) => (
                  <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="rounded-xl bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-teal-400 hover:text-black">
                    {g}
                  </Link>
                ))}
              </div>

              {/* Logged in: Logout. Logged out: Login (the bar has it on desktop, so mobile only here) */}
              <div className={`mt-4 border-t border-white/10 pt-3 ${authed ? "" : "md:hidden"}`}>
                {authed ? (
                  <button onClick={logout} className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/20">
                    Logout
                  </button>
                ) : (
                  <Link href="/login" className="block rounded-xl bg-teal-400 py-2.5 text-center text-sm font-semibold text-black hover:brightness-110">
                    Login
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );

  // Portal to <body>: position:fixed is then always relative to the screen.
  return mounted ? createPortal(bar, document.body) : bar;
}