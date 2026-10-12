import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const base = SITE_URL.replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, per-user pages: nothing for a search engine to show.
        disallow: ["/login", "/profile", "/watchlist"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}