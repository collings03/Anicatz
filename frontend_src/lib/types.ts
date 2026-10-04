export type Anime = {
  id: number;
  idMal: number | null;
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
export const availableEpisodes = (a: Anime): number =>
  a.nextAiringEpisode ? Math.max(a.nextAiringEpisode.episode - 1, 0) : a.episodes ?? 0;

/** AniList descriptions contain stray HTML tags. */
export const stripHtml = (s: string | null) =>
  (s ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
