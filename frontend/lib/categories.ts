import type { BrowseParams } from "./api";

export const CATEGORIES: Record<string, { title: string; params: BrowseParams }> = {
  "top-airing": { title: "Top Airing", params: { sort: "trending", status: "RELEASING" } },
  "most-popular": { title: "Most Popular", params: { sort: "popular" } },
  "most-favorite": { title: "Most Favorite", params: { sort: "favorite" } },
  completed: { title: "Latest Completed", params: { sort: "latest", status: "FINISHED" } },
  movies: { title: "Movies", params: { sort: "popular", format: "MOVIE" } },
  tv: { title: "TV Series", params: { sort: "popular", format: "TV" } },
};

export const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mahou Shoujo", "Mecha",
  "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports",
  "Supernatural", "Thriller",
];

export const FORMAT_OPTIONS = [
  { value: "TV", label: "TV" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
];

export const STATUS_OPTIONS = [
  { value: "RELEASING", label: "Airing" },
  { value: "FINISHED", label: "Finished" },
  { value: "NOT_YET_RELEASED", label: "Not yet aired" },
];

export const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "trending", label: "Trending" },
  { value: "favorite", label: "Most favorite" },
  { value: "score", label: "Top rated" },
  { value: "latest", label: "Newest" },
];