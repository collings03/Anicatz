import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/AnimeCard";
import { getAnime, getRecommendations } from "@/lib/api";
import { animeSlug, availableEpisodes, displayTitle, idFromSlug, stripHtml } from "@/lib/types";

function airsIn(ts: number) {
  const s = ts - Math.floor(Date.now() / 1000);
  if (s <= 0) return "airing now";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m}m` : `in ${m}m`;
}

export default async function AnimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  const id = idFromSlug(slug);
  if (!id) notFound();
  const [anime, recs] = await Promise.all([
    getAnime(id).catch(() => null),
    getRecommendations(id).catch(() => []),
  ]);
  if (!anime) notFound();

  const eps = availableEpisodes(anime);
  const canWatch = !!anime.idMal && eps > 0;
  const path = animeSlug(anime);
  const accent = anime.coverImage.color ?? "#7c5cff";
  const score = anime.averageScore;
  const airing = anime.status === "RELEASING";
  const description = stripHtml(anime.description);
  const jump = Array.from({ length: Math.min(eps, 30) }, (_, i) => i + 1);

  const tiles: [string, string | undefined][] = [
    ["Format", anime.format?.replace("_", " ")],
    ["Episodes", anime.episodes ? String(anime.episodes) : eps ? `${eps} so far` : undefined],
    ["Season", [anime.season, anime.seasonYear].filter(Boolean).join(" ") || undefined],
    ["Status", anime.status?.replaceAll("_", " ").toLowerCase()],
  ];

  return (
    <main style={{ "--accent": accent } as React.CSSProperties} className="relative -mt-24 w-full overflow-x-clip pb-28 md:pb-16">
      {/* Backdrop. The fades use --page-bg so they follow light/dark mode. */}
      <div className="absolute inset-x-0 top-0 h-[36rem] overflow-hidden">
        <Image
          src={anime.bannerImage ?? anime.coverImage.extraLarge}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover ${anime.bannerImage ? "opacity-50" : "opacity-30 blur-2xl scale-110"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--page-bg)] via-[color:var(--page-bg)]/70 to-[color:var(--page-bg)]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--page-bg)]/90 via-transparent to-transparent" />
        <div className="absolute -left-20 top-20 h-96 w-96 rounded-full opacity-30 blur-3xl" style={{ background: "var(--accent)" }} />
        {anime.seasonYear && (
          <span
            aria-hidden
            className="absolute -right-2 top-24 select-none font-display text-[6rem] font-black leading-none sm:-right-4 sm:top-28 sm:text-[14rem]"
            style={{ color: "transparent", WebkitTextStroke: "2px var(--ring-track)" }}
          >
            {anime.seasonYear}
          </span>
        )}
      </div>

      <div className="relative px-4 pt-10 sm:px-6 md:pt-24 lg:pt-28">
        {/* Breadcrumb */}
        <nav className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-white/50 sm:mb-6">
          <Link href="/" className="hover:text-teal-400">Home</Link>
          <span>/</span>
          {anime.format && (
            <>
              <span>{anime.format.replace("_", " ")}</span>
              <span>/</span>
            </>
          )}
          <span className="min-w-0 truncate text-white/80">{displayTitle(anime)}</span>
        </nav>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          {/* Poster */}
          <div className="mx-auto w-40 sm:w-52 lg:mx-0 lg:w-full">
            <div className="relative aspect-[2/3] -rotate-2 overflow-hidden rounded-3xl ring-1 ring-white/20 shadow-[0_25px_90px_-25px_var(--accent)] transition duration-500 hover:rotate-0 hover:scale-[1.02]">
              <Image src={anime.coverImage.extraLarge} alt={displayTitle(anime)} fill priority sizes="240px" className="object-cover" />
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 space-y-4 max-lg:text-center sm:space-y-5">
            <div>
              <h1 className="break-words font-display text-3xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">{displayTitle(anime)}</h1>
              {anime.title.english && anime.title.english !== anime.title.romaji && (
                <p className="mt-2 text-sm text-white/50">{anime.title.romaji}</p>
              )}
            </div>

            {/* Score + status */}
            <div className="flex flex-wrap items-center gap-3 max-lg:justify-center">
              {score != null && (
                <div
                  className="grid h-16 w-16 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#c8ff3d ${score}%, var(--ring-track) 0)` }}
                  title={`${score}% on AniList`}
                >
                  <div className="grid h-[3.4rem] w-[3.4rem] place-items-center rounded-full bg-[color:var(--card-bg)] font-display text-lg">
                    {(score / 10).toFixed(1)}
                  </div>
                </div>
              )}
              {airing && (
                <span className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400" />
                  </span>
                  Airing
                  {anime.nextAiringEpisode && (
                    <span className="text-white/60">
                      &middot; Ep {anime.nextAiringEpisode.episode} {airsIn(anime.nextAiringEpisode.airingAt)}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 max-lg:justify-center">
              {anime.genres.map((g) => (
                <Link
                  key={g}
                  href={`/genre/${encodeURIComponent(g)}`}
                  className="rounded-full bg-white/5 px-3.5 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black hover:ring-teal-400"
                >
                  {g}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 max-lg:justify-center">
              {canWatch ? (
                <>
                  <Link
                    href={`/watch/${path}/1`}
                    className="min-w-0 flex-1 rounded-full bg-teal-400 px-5 py-3 text-center text-sm font-semibold text-black shadow-[0_0_40px_-6px_rgba(200,255,61,0.6)] transition hover:brightness-110 sm:flex-none sm:px-8"
                  >
                    &#9654; Watch episode 1
                  </Link>
                  <a href="#episodes" className="glass min-w-0 flex-1 rounded-full px-5 py-3 text-center text-sm transition hover:bg-white/10 sm:flex-none sm:px-6">
                    Episodes
                  </a>
                </>
              ) : (
                <p className="glass rounded-full px-5 py-2.5 text-sm text-white/50">No episodes available to watch yet.</p>
              )}
            </div>

            {/* Info tiles */}
            <dl className="grid max-w-2xl grid-cols-2 gap-2.5 text-left sm:grid-cols-4 sm:gap-3 max-lg:mx-auto">
              {tiles
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="glass rounded-2xl px-4 py-3">
                    <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">{k}</dt>
                    <dd className="mt-1 text-sm capitalize">{v}</dd>
                  </div>
                ))}
            </dl>

            {/* Synopsis with Read more */}
            {description && (
              <div className="max-w-3xl text-left">
                <input id="more" type="checkbox" className="peer sr-only" />
                <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-white/70 peer-checked:line-clamp-none">
                  {description}
                </p>
                <label
                  htmlFor="more"
                  className="mt-2 inline-block cursor-pointer text-sm text-teal-400 hover:underline peer-checked:[&>.more]:hidden [&>.less]:hidden peer-checked:[&>.less]:inline"
                >
                  <span className="more">Read more</span>
                  <span className="less">Show less</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Episode chips */}
        {canWatch && (
          <section id="episodes" className="mt-10 scroll-mt-28 sm:mt-14">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold">
              <span className="h-5 w-1 rounded-full bg-teal-400" /> Jump to episode
            </h2>
            <div className="glass flex flex-wrap gap-2 rounded-3xl p-3 sm:p-4">
              {jump.map((n) => (
                <Link
                  key={n}
                  href={`/watch/${path}/${n}`}
                  className="grid h-9 min-w-[2.25rem] place-items-center rounded-xl sm:h-10 sm:min-w-[2.5rem] bg-white/5 px-3 text-sm text-white/80 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black hover:ring-teal-400"
                >
                  {n}
                </Link>
              ))}
              {eps > jump.length && (
                <Link href={`/watch/${path}/1`} className="grid h-10 place-items-center rounded-xl px-3 text-sm text-teal-400 hover:underline">
                  +{eps - jump.length} more in player
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold">
              <span className="h-5 w-1 rounded-full bg-teal-400" /> You might also like
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 xl:grid-cols-8">
              {recs.map((r) => (
                <AnimeCard key={r.id} anime={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}