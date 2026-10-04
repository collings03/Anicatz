import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "AniCatz - Your Anime. Your World.",
  description: "Discover anime, track releases and watch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body id="top" className="flex min-h-screen flex-col font-sans antialiased">
        <Navbar />
        <div className="flex-1 pt-24">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

