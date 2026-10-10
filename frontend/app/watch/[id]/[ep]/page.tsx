import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import AnimeCard from "@/components/AnimeCard";
import Comments from "@/components/Comments";
import EpisodeSelector from "@/components/EpisodeSelector";
import HistoryTracker from "@/components/HistoryTracker";
import WatchClient from "@/components/WatchClient";

import {
  getAnime,
  getRecommendations,
} from "@/lib/api";

import {
  animeSlug,
  availableEpisodes,
  displayTitle,
  idFromSlug,
  stripHtml,
} from "@/lib/types";

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
    getAnime(id).catch(() => null),
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
    <main className="grid w-full gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
      {/* History */}

      <HistoryTracker
        slug={path}
        episode={episode}
        title={displayTitle(anime)}
        image={anime.coverImage.large ?? null}
      />

      {/* Episode list: numbers up to 100, a range dropdown (1-100, 101-200, ...) beyond that */}

      <aside className="order-2 min-w-0 lg:order-1">
        <h2 className="mb-3 text-lg font-semibold">
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
        <Link
          href={`/anime/${path}`}
          className="text-sm text-neutral-400 hover:text-white"
        >
          &larr; {displayTitle(anime)}
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

        <div className="pt-4">
          <Comments
            animeId={Number(id)}
            episode={episode}
          />
        </div>
      </section>

      {/* Anime info */}

      <aside className="order-3 min-w-0 space-y-3">
        <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-lg lg:w-full">
          <Image
            src={anime.coverImage.large}
            alt=""
            fill
            sizes="280px"
            className="object-cover"
          />
        </div>

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

        <p className="line-clamp-6 text-sm text-neutral-300">
          {stripHtml(anime.description)}
        </p>
      </aside>

      {/* Recommendations */}

      {recs.length > 0 && (
        <section className="order-4 pt-4 lg:col-span-3">
          <h2 className="mb-4 text-xl font-semibold">
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