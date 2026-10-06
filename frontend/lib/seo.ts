// Save as: frontend/lib/seo.ts
// Set NEXT_PUBLIC_SITE_URL in Vercel (website project), e.g. https://anicatz.vercel.app
// When you buy a custom domain, change that one variable.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://anicatz.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "AniCatz";
export const SITE_TAGLINE = "Your Anime. Your World.";
export const SITE_DESCRIPTION =
  "Discover anime on AniCatz: trending and top airing series, the weekly release schedule, genres, scores and episode guides, all in one place.";

/** Cuts text at a word boundary for meta descriptions (about 155 characters is what search results show). */
export function clip(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}