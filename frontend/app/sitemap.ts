import type { MetadataRoute } from "next";
import { API } from "@/lib/auth";
import { SITE_URL } from "@/lib/seo";
import { animeSlug } from "@/lib/types";

// Rebuilt at most once an hour, so it never hammers your backend or AniList.
export const revalidate = 3600;

const base = SITE_URL.replace(/\/+$/, "");

// AniList's genres (adult ones left out).
const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Mahou Shoujo", "Mecha", "Music",
  "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];

type Item = Parameters<typeof animeSlug>[0];

/** One page of a list from your backend. Any failure just means "no extra URLs", so the sitemap still builds. */
async function fetchList(kind: "popular" | "trending", page: number): Promise<Item[]> {
  try {
    const r = await fetch(`${API}/anime/${kind}/?page=${page}&per_page=50`, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data?.media) ? data.media : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // One request after another (not all at once) so AniList's rate limit isn't triggered.
  const found = new Map<number, Item>();
  const plan: ["popular" | "trending", number][] = [["popular", 1], ["popular", 2], ["popular", 3], ["popular", 4], ["trending", 1]];
  for (const [kind, page] of plan) {
    for (const a of await fetchList(kind, page)) found.set(a.id, a);
  }

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/schedule`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...GENRES.map((g) => ({
      url: `${base}/genre/${encodeURIComponent(g)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...[...found.values()].map((a) => ({
      url: `${base}/anime/${animeSlug(a)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}