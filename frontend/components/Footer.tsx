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

const head = "mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40";
const link = "inline-block text-sm text-white/60 transition duration-200 hover:translate-x-1 hover:text-teal-400";

// Fades the frame out toward the bottom so it melts into the page background.
const fade = "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)";

export default function Footer() {
  return (
    // Extra bottom padding on phones keeps the last line clear of the fixed bottom nav.
    <footer className="relative mt-14 overflow-x-clip px-2 pb-28 sm:mt-20 sm:px-3 md:pb-0">
      <div className="relative mx-auto w-full max-w-[1400px]">
        {/* Decorative frame: border + fill + glows, all fading out at the bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[1.5rem] sm:rounded-t-[2rem]"
          style={{ maskImage: fade, WebkitMaskImage: fade }}
        >
          <div className="h-full w-full bg-gradient-to-br from-teal-400/40 via-white/10 to-violet-500/40 p-px">
            <div className="h-full w-full rounded-t-[calc(1.5rem-1px)] bg-[color:var(--card-bg)] sm:rounded-t-[calc(2rem-1px)]" />
          </div>
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-64 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative px-5 pb-6 pt-7 sm:px-10 sm:pt-8">
          {/* CTA banner */}
          <div className="flex flex-col items-stretch justify-between gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:pb-8">
            <div className="text-center sm:text-left">
              <h2 className="font-display text-xl font-semibold sm:text-3xl">
                Can&apos;t decide what to <span className="text-teal-400">watch</span>?
              </h2>
              <p className="mt-1 text-sm text-white/50">Let us pick something for you, or see what&apos;s airing right now.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/random"
                prefetch={false}
                className="rounded-full bg-teal-400 px-4 py-2.5 text-center text-sm font-semibold text-black shadow-[0_0_30px_-4px_rgba(200,255,61,0.5)] transition hover:brightness-110 sm:px-6"
              >
                Surprise me &#8599;
              </Link>
              <Link
                href="/browse/top-airing"
                className="rounded-full bg-white/5 px-4 py-2.5 text-center text-sm text-white ring-1 ring-white/15 transition hover:bg-white/10 sm:px-6"
              >
                What&apos;s airing
              </Link>
            </div>
          </div>

          {/* Columns: brand and genres full width on phones, Explore + Browse side by side */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-7 sm:py-8 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
            <div className="col-span-2 space-y-3 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#c8ff3d] to-[#7c5cff] font-display text-lg font-black text-black">
                  A
                </span>
                <span className="font-display text-2xl font-bold tracking-tight">
                  ani<span className="text-teal-400">catz</span>
                </span>
              </Link>
              <p className="max-w-xs text-xs leading-relaxed text-white/50">
                Your Anime. Your World. AniCatz doesn&apos;t host any video files. Playback comes from a
                third-party player and anime data from AniList.
              </p>
            </div>

            <div>
              <h3 className={head}>Explore</h3>
              <ul className="space-y-2">
                {EXPLORE.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} prefetch={l.href === "/random" ? false : undefined} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className={head}>Browse</h3>
              <ul className="space-y-2">
                {BROWSE.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <h3 className={head}>Genres</h3>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Link
                    key={g}
                    href={`/genre/${encodeURIComponent(g)}`}
                    className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/60 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black hover:ring-teal-400"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-white/40 sm:flex-row">
            <span className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} AniCatz. All titles, images and trademarks belong to their owners.
            </span>
            <div className="flex items-center gap-4">
              <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="transition hover:text-teal-400">
                Data by AniList
              </a>
              <a
                href="#top"
                aria-label="Back to top"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-base text-white/70 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black"
              >
                &uarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}