import { cookies } from "next/headers";
import type { Anime, AnimePage } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function get<T>(path: string): Promise<T> {
  const jp = (await cookies()).get("title_lang")?.value === "jp";
  const url = `${API}${path}${jp ? (path.includes("?") ? "&" : "?") + "lang=jp" : ""}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
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