// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import NetworkStatus from "@/components/NetworkStatus";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  websiteJsonLd,
  organizationJsonLd,
  navigationJsonLd,
} from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Google shows the round icon next to the site name. It needs a square image whose size is a
  // multiple of 48px (48, 96, 192, 512). Put these files in frontend/public/.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([websiteJsonLd, organizationJsonLd, navigationJsonLd]),
          }}
        />
      </head>
      <body id="top" className="flex min-h-screen flex-col font-sans antialiased">
        {/* Shows the "No internet connection" screen when the browser goes offline. */}
        <NetworkStatus />
        <Navbar />
        {/* md:pt-24 clears the fixed top navbar on desktop. On phones the navbar is at the bottom, so no top padding. */}
        <div className="flex-1 md:pt-24">{children}</div>
        <Footer />
      </body>
    </html>
  );
}