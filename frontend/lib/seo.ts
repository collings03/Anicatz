// Save as: frontend/lib/seo.ts
// Set NEXT_PUBLIC_SITE_URL in Vercel (website project) to https://anicatz.com
// If it is not set, the code falls back to https://anicatz.com.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://anicatz.com").replace(/\/+$/, "");
export const SITE_NAME = "AniCatz";
export const SITE_TAGLINE = "Your Anime. Your World.";

/**
 * Default <title>. This is the big blue link in Google, like
 * "Adobe Creative Cloud | Desktop, mobile & web". Keep it under about 60 characters.
 */
export const SITE_TITLE = "AniCatz | Anime Website: Trending, Schedule & Episode Guides";

/**
 * The grey text under the title. Google shows about 155 characters, so keep it short
 * and written as plain sentences, like the Adobe example.
 */
export const SITE_DESCRIPTION =
  "Discover trending and top airing anime, check the weekly release schedule, and browse genres, scores and episode guides. Find what to watch next on AniCatz.";

/** Google ignores the meta keywords tag, but Bing and some other engines still read it. */
export const SITE_KEYWORDS = [
  "anime website",
  "anime site",
  "anime release schedule",
  "airing anime this season",
  "trending anime",
  "top anime",
  "anime episode guide",
  "anime genres",
  "AniCatz",
  "anicatz.com",
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

/** Helper for page titles: "Naruto | AniCatz" */
export function pageTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

/**
 * The rows under the main result in the screenshot ("Buy Adobe Creative Cloud", "Save 55%...") are
 * called SITELINKS. Google picks them itself; no tag can force them. What helps:
 *  1. A short, clear title and one-sentence description on each of these pages.
 *  2. These pages linked from the top navigation of every page (your navbar already does this).
 *  3. The pages listed in sitemap.xml and the structured data below.
 * Keep the names short and distinct, because Google uses the page titles as sitelink names.
 */
export const SITE_LINKS = [
  { name: "Trending Anime", path: "/browse/trending", description: "See which anime everyone is watching right now." },
  { name: "Anime Release Schedule", path: "/schedule", description: "Weekly airing times for every anime this season." },
  { name: "Top Rated Anime", path: "/browse/top-rated", description: "The highest scored anime of all time." },
  { name: "Anime Genres", path: "/filter", description: "Browse anime by genre, format and status." },
  { name: "Random Anime", path: "/random", description: "Can't decide? Get a random anime to watch." },
] as const;
// Change the paths above so they match your real routes.

/** Structured data: tells Google your site name and enables the search box in results. */
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  // Google shows this as the site name next to the icon (like "Adobe" in the screenshot).
  alternateName: ["AniCatz Anime", "anicatz.com"],
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  potentialAction: {
    "@type": "SearchAction",
    // Change /search?q= to match your real search route
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

/** Tells Google which pages are your main navigation, which feeds the sitelinks. */
export const navigationJsonLd = {
  "@context": "https://schema.org",
  "@graph": SITE_LINKS.map((l) => ({
    "@type": "SiteNavigationElement",
    name: l.name,
    description: l.description,
    url: `${SITE_URL}${l.path}`,
  })),
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  // The round icon beside the site name in the screenshot. Must be a square PNG, at least 48x48
  // (192x192 or 512x512 is best), reachable without login, and not blocked in robots.txt.
  logo: `${SITE_URL}/icon-512.png`,
};