// Tells Google WHO "AniCatz" is: the site name, the logo, and which social profiles belong to it.
// This is what makes the result show "AniCatz" instead of "anicatz.com", and ties handles like
// "anicatz.in" on social media back to anicatz.com.
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const site = SITE_URL.replace(/\/+$/, "");

/**
 * Official profiles of the brand. Only list pages that really exist and are yours.
 * Also put https://www.anicatz.com in each profile's bio/link, so the connection goes both ways.
 */
export const SOCIAL_PROFILES: string[] = [
  "https://www.instagram.com/anicatz.in/", // CHECK this is your real Instagram address
  // "https://www.youtube.com/@yourchannel",
  // "https://x.com/yourhandle",
];

// Other ways people write the name, so searches for any of them reach the same site.
const alternateNames = [...new Set(["AniCatz", "Anicatz", "anicatz", "anicatz.com"])].filter((n) => n !== SITE_NAME);

export const brandWebsiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site}/#website`,
  name: SITE_NAME,
  alternateName: alternateNames,
  url: `${site}/`,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": `${site}/#organization` },
};

export const brandOrganizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${site}/#organization`,
  name: SITE_NAME,
  alternateName: alternateNames,
  url: `${site}/`,
  logo: { "@type": "ImageObject", url: `${site}/icon-512.png`, width: 512, height: 512 },
  sameAs: SOCIAL_PROFILES.length ? SOCIAL_PROFILES : undefined,
};