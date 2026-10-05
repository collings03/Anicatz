"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

/**
 * Category switcher for the Browse pages (Top Airing, Most Popular, ...).
 * Phones: a compact dropdown that sits on the right side of the title row.
 * Desktop: a row of pills on the right side.
 */
export default function BrowseSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const entries = Object.entries(CATEGORIES);

  return (
    <>
      {/* Phones */}
      <div className="relative shrink-0 md:hidden">
        <select
          aria-label="Browse category"
          value={current}
          onChange={(e) => router.push(`/browse/${e.target.value}`)}
          className="appearance-none rounded-full bg-white/10 py-1.5 pl-3.5 pr-8 text-xs font-semibold text-white outline-none ring-1 ring-white/15 focus:ring-teal-400 [&>option]:bg-neutral-900"
        >
          {entries.map(([slug, c]) => (
            <option key={slug} value={slug}>
              {c.title}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/70"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {/* Desktop */}
      <nav aria-label="Browse category" className="hidden shrink-0 items-center gap-1.5 md:flex">
        {entries.map(([slug, c]) => (
          <Link
            key={slug}
            href={`/browse/${slug}`}
            aria-current={slug === current ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              slug === current
                ? "bg-teal-400 font-semibold text-black"
                : "bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {c.title}
          </Link>
        ))}
      </nav>
    </>
  );
}