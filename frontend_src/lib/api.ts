import type { Anime, AnimePage } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

export const getTrending = () => get<AnimePage>("/anime/trending/");
export const getPopular = () => get<AnimePage>("/anime/popular/");
export const searchAnime = (q: string) => get<AnimePage>(`/anime/search/?q=${encodeURIComponent(q)}`);
export const getAnime = (id: number | string) => get<Anime>(`/anime/${id}/`);
