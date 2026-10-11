import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Browsers load covers straight from AniList's CDN, so the Render server
    // doesn't have to download and resize every image itself.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "s4.anilist.co" }],
  },
};

export default nextConfig;