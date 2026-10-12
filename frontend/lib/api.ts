import { cookies } from "next/headers";
import type { Anime, AnimePage } from "./types";

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "https://anicatz-1.onrender.com/api";

// Render's free backend can take 30-60 seconds to wake up after a pause, so the wait must be longer than that.
// (A 10 second limit cut those requests off and the home page sections disappeared.)
const TIMEOUT_MS = 55000;

export class ApiError extends Error {
  status: number;

  constructor(status: number, path: string) {
    super(`API ${status} for ${path}`);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(path: string): Promise<T> {
  const jp = (await cookies()).get("title_lang")?.value === "jp";
  const url = `${API}${path}${jp ? (path.includes("?") ? "&" : "?") + "lang=jp" : ""}`;

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.ok) return await res.json();

      throw new ApiError(res.status, path);
    } catch (error) {
      // HTTP errors (404, 503...) are answers from the backend, so they are not retried.
      if (error instanceof ApiError) throw error;

      // Network errors and timeouts get one more try.
      lastError = error;
      if (attempt < 1) await sleep(700);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`API failed for ${path}`);
}

export type BrowseParams = {
  sort?: string;
  status?: string;
  format?: string;
  genre?: string;
  page?: number;
  per_page?: number;
};

export const getBrowse = (p: BrowseParams = {}) => {
  const qs = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  return get<AnimePage>(`/anime/browse/?${qs}`);
};

export const getTrending = () => get<AnimePage>("/anime/trending/");
export const getPopular = () => get<AnimePage>("/anime/popular/");
export const searchAnime = (q: string) => get<AnimePage>(`/anime/search/?q=${encodeURIComponent(q)}`);
export const getAnime = (id: number | string) => get<Anime>(`/anime/${id}/`);
export const getRecommendations = (id: number | string) => get<Anime[]>(`/anime/${id}/recommendations/`);

/** Returns null only when the anime really does not exist (404). Any other failure is thrown. */
export async function getAnimeOrNull(id: number | string): Promise<Anime | null> {
  try {
    return await getAnime(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}