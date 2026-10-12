// Search-engine metadata for anime and watch pages.
import type { Metadata } from "next";
import { getAnime } from "@/lib/api";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { displayTitle, stripHtml } from "@/lib/types";

type Anime = NonNullable<Awaited<ReturnType<typeof getAnime>>>;

const site = SITE_URL.replace(/\/+$/, "");

/** Cuts text to about `max` characters at a word boundary (search results show ~155). */
export function shorten(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return cut.slice(0, at > 80 ? at : max).replace(/[.,;:!?-]+$/, "") + "...";
}

/** Title, description, canonical link and share card for an anime page, or for one episode when `episode` is given. */
export function animeMetadata(anime: Anime, opts: { path: string; episode?: number }): Metadata {
  const name = displayTitle(anime);
  const synopsis = stripHtml(anime.description);
  const intro = opts.episode
    ? `Watch ${name} episode ${opts.episode} online on ${SITE_NAME}.`
    : `${name}: episodes, air dates, rating and where to watch on ${SITE_NAME}.`;
  const description = shorten(synopsis ? `${intro} ${synopsis}` : intro);
  const title = opts.episode ? `${name} Episode ${opts.episode}` : name;
  const image = anime.bannerImage ?? anime.coverImage?.extraLarge ?? undefined;

  return {
    title,
    description,
    // The page's own address. Google uses it to avoid indexing duplicate versions of the same page.
    alternates: { canonical: opts.path },
    // A page-level openGraph replaces the layout's completely, so everything is repeated here.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: opts.path,
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** Structured data (schema.org) that lets Google understand the page and show breadcrumbs. */
export function animeJsonLd(anime: Anime, path: string) {
  const name = displayTitle(anime);
  const url = `${site}${path}`;
  const isMovie = anime.format === "MOVIE";
  const otherNames = [anime.title?.romaji, anime.title?.english].filter((t): t is string => !!t && t !== name);
  const synopsis = shorten(stripHtml(anime.description), 300);

  return [
    {
      "@context": "https://schema.org",
      "@type": isMovie ? "Movie" : "TVSeries",
      name,
      url,
      image: anime.coverImage?.extraLarge,
      description: synopsis || undefined,
      genre: anime.genres?.length ? anime.genres : undefined,
      alternateName: otherNames.length ? otherNames : undefined,
      numberOfEpisodes: !isMovie && anime.episodes ? anime.episodes : undefined,
      datePublished: anime.seasonYear ? String(anime.seasonYear) : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
        { "@type": "ListItem", position: 2, name, item: url },
      ],
    },
  ];
}

/** JSON for a <script type="application/ld+json">. Escapes "<" so a synopsis can never close the script tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");