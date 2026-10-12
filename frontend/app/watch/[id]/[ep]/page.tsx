import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import AnimeCard from "@/components/AnimeCard";
import Comments from "@/components/Comments";
import EpisodeSelector from "@/components/EpisodeSelector";
import HistoryTracker from "@/components/HistoryTracker";
import WatchClient from "@/components/WatchClient";
import { animeMetadata } from "@/lib/anime-seo";

import {
  getAnimeOrNull,
  getRecommendations,
} from "@/lib/api";

import {
  animeSlug,
  availableEpisodes,
  displayTitle,
  idFromSlug,
  stripHtml,
} from "@/lib/types";

// Each episode gets its own title, description and canonical address for search engines and link previews.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; ep: string }>;
}): Promise<Metadata> {
  const { id: slug, ep } = await params;
  const id = idFromSlug(slug);
  const anime = id ? await getAnimeOrNull(id) : null;
  const episode = Number(ep);

  if (!anime || !Number.isInteger(episode) || episode < 1 || episode > availableEpisodes(anime)) {
    return { title: "Episode not found", robots: { index: false } };
  }
  return animeMetadata(anime, { path: `/watch/${animeSlug(anime)}/${episode}`, episode });
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{
    id: string;
    ep: string;
  }>;
}) {
  const { id: slug, ep } = await params;

  const id = idFromSlug(slug);

  if (!id) {
    notFound();
  }

  const [anime, recs] = await Promise.all([
    getAnimeOrNull(id),
    getRecommendations(id).catch(() => []),
  ]);

  if (!anime) {
    notFound();
  }

  const path = animeSlug(anime);

  const total = availableEpisodes(anime);
  const episode = Number(ep);

  /*
   * We need both:
   *
   * anime.id    -> AniList ID -> Cosmic
   * anime.idMal -> MAL ID     -> ZokoAnime
   */
  if (
    !anime.idMal ||
    !anime.id ||
    !Number.isInteger(episode) ||
    episode < 1 ||
    episode > total
  ) {
    notFound();
  }

  return (
    /*
     * Phones: pt-20 clears the fixed header so the logo no longer sits on top of
     * the back link. If the gap looks too big, lower pt-20 (for example pt-16).
     * mx-auto + max-w keeps the layout centered and stops it stretching on huge screens.
     */
    <main className="relative mx-auto grid w-full max-w-[1800px] gap-5 px-3 pb-10 pt-16 sm:gap-6 sm:px-6 sm:pt-24 lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:pt-6">
      {/* History */}

      <HistoryTracker
        slug={path}
        episode={episode}
        title={displayTitle(anime)}
        image={anime.coverImage.large ?? null}
      />

      {/* Episode list: numbers up to 100, a range dropdown (1-100, 101-200, ...) beyond that */}

      <aside className="order-2 min-w-0 lg:order-1">
        <h2 className="mb-3 text-base font-semibold sm:text-lg">
          Episodes
        </h2>

        <div className="rounded-lg border border-neutral-800 p-3">
          <EpisodeSelector
            total={total}
            basePath={`/watch/${path}`}
            current={episode}
            gridClassName="grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-5"
            scrollClassName="max-h-56 lg:max-h-[60vh]"
          />
        </div>
      </aside>

      {/* Player + comments */}

      <section className="order-1 min-w-0 space-y-4 lg:order-2">
        {/* Phones: compact "Back" pill pinned top right, level with the logo.
            sm and up: normal link with the anime title. */}
        <Link
          href={`/anime/${path}`}
          aria-label={`Back to ${displayTitle(anime)}`}
          className="absolute right-3 top-2 z-10 flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20 sm:static sm:block sm:min-w-0 sm:truncate sm:rounded-none sm:bg-transparent sm:p-0 sm:py-1 sm:font-normal sm:text-neutral-400 sm:ring-0 sm:backdrop-blur-none sm:hover:bg-transparent sm:hover:text-white"
        >
          <span aria-hidden>&larr;</span>
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">{displayTitle(anime)}</span>
        </Link>

        <WatchClient
          slug={path}
          malId={anime.idMal}
          aniId={anime.id}
          episode={episode}
          total={total}
          color={anime.coverImage.color ?? undefined}
        />

        <p className="text-sm text-neutral-400">
          You are watching{" "}
          <span className="font-semibold text-white">
            Episode {episode}
          </span>
        </p>

        <div className="pt-2 sm:pt-4">
          <Comments
            animeId={Number(id)}
            episode={episode}
          />
        </div>
      </section>

      {/* Anime info: stacked on phones, poster beside the text on tablets, sidebar on desktop */}

      <aside className="order-3 min-w-0 space-y-3 md:flex md:items-start md:gap-5 md:space-y-0 lg:block lg:space-y-3">
        <div className="relative mx-auto aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg sm:w-36 md:mx-0 md:w-40 lg:mx-auto lg:w-full">
          <Image
            src={anime.coverImage.large}
            alt=""
            fill
            sizes="(max-width: 1024px) 160px, 280px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 space-y-3 max-md:text-center">
          <h2 className="text-lg font-semibold">
            {displayTitle(anime)}
          </h2>

          <p className="text-xs text-neutral-400">
            {[
              anime.format,
              anime.seasonYear,
              anime.averageScore != null &&
                `${anime.averageScore}%`,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>

          <p className="line-clamp-5 text-left text-sm text-neutral-300 lg:line-clamp-6">
            {stripHtml(anime.description)}
          </p>
        </div>
      </aside>

      {/* Recommendations */}

      {recs.length > 0 && (
        <section className="order-4 pt-2 sm:pt-4 lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold sm:text-xl">
            Recommended for you
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 xl:grid-cols-8">
            {recs.map((r) => (
              <AnimeCard
                key={r.id}
                anime={r}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}