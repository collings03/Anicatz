"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";

const EXPLORE = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/random", label: "Random" },
  { href: "/browse/movies", label: "Movies" },
  { href: "/browse/tv", label: "TV Series" },
];

const BROWSE = [
  { href: "/browse/top-airing", label: "Top Airing" },
  { href: "/browse/most-popular", label: "Most Popular" },
  { href: "/browse/most-favorite", label: "Most Favorite" },
  { href: "/browse/completed", label: "Latest Completed" },
];

const GENRES = ["Action", "Adventure", "Comedy", "Fantasy", "Romance", "Sci-Fi", "Mystery", "Sports"];

const head = "mb-1.5 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 sm:block";
// Phones: links flow in a wrapped row. Larger screens: a stacked column.
const list = "flex flex-wrap gap-x-3 gap-y-0.5 sm:block sm:space-y-1.5";
const link = "inline-block text-[11px] text-white/60 transition duration-200 hover:text-teal-400 sm:text-[13px] sm:hover:translate-x-1";

// Fades the frame out toward the bottom so it melts into the page background.
const fade = "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)";

// Pages that should not show the footer.
const NO_FOOTER = ["/login", "/register"];

export default function Footer() {
  const pathname = usePathname();
  if (NO_FOOTER.includes(pathname)) return null;

  return (
    // Extra bottom padding on phones keeps the last line clear of the fixed bottom nav.
    <footer className="relative mt-6 overflow-x-clip px-2 pb-20 sm:mt-12 sm:px-3 md:pb-0">
      <div className="relative mx-auto w-full max-w-[1400px]">
        {/* Decorative frame: border + fill + glows, all fading out at the bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[1.25rem] sm:rounded-t-[1.5rem]"
          style={{ maskImage: fade, WebkitMaskImage: fade }}
        >
          <div className="h-full w-full bg-gradient-to-br from-teal-400/40 via-white/10 to-violet-500/40 p-px">
            <div className="h-full w-full rounded-t-[calc(1.25rem-1px)] bg-[color:var(--card-bg)] sm:rounded-t-[calc(1.5rem-1px)]" />
          </div>
          <div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute bottom-6 right-0 h-40 w-56 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative px-4 pb-2 pt-3 sm:px-8 sm:pb-3 sm:pt-5">
          {/* CTA banner */}
          <div className="flex flex-col items-stretch justify-between gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:gap-4 sm:pb-4">
            <h2 className="text-center font-display text-sm font-semibold sm:text-left sm:text-xl">
              Can&apos;t decide what to <span className="text-teal-400">watch</span>?
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link
                href="/random"
                prefetch={false}
                className="rounded-full bg-teal-400 px-4 py-1.5 text-center text-[11px] font-semibold text-black shadow-[0_0_24px_-4px_rgba(200,255,61,0.5)] transition hover:brightness-110 sm:px-5 sm:text-xs"
              >
                Surprise me &#8599;
              </Link>
              <Link
                href="/browse/top-airing"
                className="rounded-full bg-white/5 px-4 py-1.5 text-center text-[11px] text-white ring-1 ring-white/15 transition hover:bg-white/10 sm:px-5 sm:text-xs"
              >
                What&apos;s airing
              </Link>
            </div>
          </div>

          {/* Columns: on phones everything stacks as compact wrapped rows */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 py-3 sm:gap-y-4 sm:py-4 lg:grid-cols-[1.3fr_1fr_1fr_1.4fr]">
            <div className="col-span-2 space-y-1.5 lg:col-span-1">
              <Link href="/" aria-label="anicatz home" className="inline-block">
                {/* Dark theme: white "ani". Light theme: navy "ani". */}
                <Image
                  src="/anicatz-logo.png"
                  alt="anicatz"
                  width={640}
                  height={147}
                  className="h-5 w-auto sm:h-6 [[data-theme=light]_&]:hidden"
                />
                <Image
                  src="/anicatz-logo-light.png"
                  alt="anicatz"
                  width={640}
                  height={147}
                  className="hidden h-5 w-auto sm:h-6 [[data-theme=light]_&]:block"
                />
              </Link>
              <p className="hidden max-w-xs text-[11px] leading-relaxed text-white/50 sm:block">
                Your Anime. Your World. AniCatz doesn&apos;t host any video files. Playback comes from a
                third-party player and anime data from AniList.
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className={head}>Explore</h3>
              <ul className={list}>
                {EXPLORE.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} prefetch={l.href === "/random" ? false : undefined} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className={head}>Browse</h3>
              <ul className={list}>
                {BROWSE.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 hidden sm:block lg:col-span-1">
              <h3 className={head}>Genres</h3>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <Link
                    key={g}
                    href={`/genre/${encodeURIComponent(g)}`}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/60 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black hover:ring-teal-400"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-[10px] text-white/40 sm:pt-3 sm:text-[11px]">
            <span className="min-w-0 leading-snug">
              &copy; {new Date().getFullYear()} AniCatz. All titles, images and trademarks belong to their owners.{" "}
              <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap transition hover:text-teal-400">
                Data by AniList
              </a>
            </span>
            <a
              href="#top"
              aria-label="Back to top"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-sm text-white/70 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black"
            >
              &uarr;
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}