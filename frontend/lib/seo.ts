// Save as: frontend/lib/seo.ts
// Set NEXT_PUBLIC_SITE_URL in Vercel (website project), e.g. https://anicatz.vercel.app
// When you buy a custom domain, change that one variable.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://anicatz.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "AniCatz";
export const SITE_TAGLINE = "Your Anime. Your World.";

/** Default <title>. Puts the phrase people actually search ("anime website") next to the brand. */
export const SITE_TITLE = "AniCatz – Anime Website: Trending Anime, Schedule & Episode Guides";

export const SITE_DESCRIPTION =
  "AniCatz is an anime website for trending and top airing series, the weekly release schedule, genres, scores and episode guides. A free alternative to HiAnime and Crunchyroll for discovering what to watch next.";

/** Google ignores the meta keywords tag, but Bing and some other engines still read it. */
export const SITE_KEYWORDS = [
  "anime website",
  "anime site",
  "watch anime online",
  "free anime website",
  "anime streaming site",
  "anime release schedule",
  "airing anime this season",
  "trending anime",
  "top anime",
  "anime episode guide",
  "anime genres",
  "AniCatz",
  "HiAnime alternative",
  "Crunchyroll alternative",
  "sites like HiAnime",
  "sites like Crunchyroll",
];

/** Cuts text at a word boundary for meta descriptions (about 155 characters is what search results show). */
export function clip(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Helper for page titles: "Naruto – Episodes & Info | AniCatz" */
export function pageTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

/** Structured data: tells Google your site name and enables the search box in results. */
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["AniCatz Anime", "AniCatz anime website"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    // Change /search?q= to match your real search route
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
};