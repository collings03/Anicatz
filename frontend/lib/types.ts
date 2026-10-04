export type Anime = {
  id: number;
  idMal: number | null;
  isAdult?: boolean;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; extraLarge: string; color: string | null };
  bannerImage: string | null;
  description: string | null;
  episodes: number | null;
  status: string;
  format: string | null;
  season: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  genres: string[];
  nextAiringEpisode: { episode: number; airingAt: number } | null;
};

export type AnimePage = {
  pageInfo: { hasNextPage: boolean; currentPage: number };
  media: Anime[];
};

export const displayTitle = (a: Anime) => a.title.english || a.title.romaji;

/** Episodes that can be watched right now (airing shows have no total yet). */
/** Episodes that can be watched right now (airing shows have no total yet). */
export const availableEpisodes = (a: Anime): number => {
  const next = a.nextAiringEpisode;
  if (next) {
    // If the "next" episode's air time has already passed, it is out now too.
    return next.airingAt * 1000 <= Date.now() ? next.episode : Math.max(next.episode - 1, 0);
  }
  return a.episodes ?? 0;
};
/** AniList descriptions contain stray HTML tags. */
export const stripHtml = (s: string | null) =>
  (s ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");

export type ScheduleItem = {
  airingAt: number; // unix seconds
  episode: number;
  media: Anime;
};

/** "One Piece" + 21 -> "one-piece-21" */
export const animeSlug = (a: Anime) => {
  const name = displayTitle(a)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return name ? `${name}-${a.id}` : String(a.id);
};

/** "one-piece-21" -> "21" (also accepts plain "21") */
export const idFromSlug = (slug: string) => slug.match(/(\d+)$/)?.[1] ?? null;