// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import AuthKeepAlive from "@/components/AuthKeepAlive";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import NetworkStatus from "@/components/NetworkStatus";
import { brandOrganizationJsonLd, brandWebsiteJsonLd } from "@/lib/brand-seo";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  navigationJsonLd,
} from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

// Theme colour for the phone's browser bar and the installed-app window.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0e24" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f8" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Google shows the round icon next to the site name in search results. It must be a square image whose
  // side is a multiple of 48px (48, 96, 144, 192...). 512 is NOT a multiple of 48, so it is left out here
  // (it is still used for the installable-app icon in app/manifest.ts).
  // Generate all of these from your logo with:  python tools/make_icons.py
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "entertainment",
  // NOTE: no `alternates.canonical` and no `openGraph.url` here on purpose. Layout values are inherited by
  // EVERY page, so a canonical of "/" would tell Google that all your anime pages are duplicates of the homepage.
  // Each page sets its own (anime and watch pages do it in generateMetadata).
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Google Search Console: paste the code from "HTML tag" verification into NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([brandWebsiteJsonLd, brandOrganizationJsonLd, navigationJsonLd]),
          }}
        />
      </head>
      <body id="top" className="flex min-h-screen flex-col font-sans antialiased">
        {/* Shows the "No internet connection" screen when the browser goes offline. */}
        <NetworkStatus />
        {/* Keeps the login token fresh in the background so you stay logged in. */}
        <AuthKeepAlive />
        <Navbar />
        {/* md:pt-24 clears the fixed top navbar on desktop. On phones the navbar is at the bottom, so no top padding. */}
        <div className="flex-1 md:pt-24">{children}</div>
        <Footer />
      </body>
    </html>
  );
}