"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { animeSlug, displayTitle, type Anime } from "@/lib/types";

export default function Top10Tabs({ tabs }: { tabs: { label: string; items: Anime[] }[] }) {
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;
  const items = tabs[active]?.items ?? [];

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-lg font-semibold sm:text-xl">Top 10</h2>
        <div className="flex shrink-0 rounded-full bg-white/5 p-1 text-xs ring-1 ring-white/10" role="tablist">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              // Slightly larger tap target on phones
              className={`rounded-full px-3.5 py-1.5 transition sm:px-3 sm:py-1 ${
                active === i ? "bg-teal-400 font-medium text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ol role="tabpanel" className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
        {items.slice(0, 10).map((a, idx) => (
          <li key={a.id}>
            <Link
              href={`/anime/${animeSlug(a)}`}
              className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5"
            >
              {/* fixed columns: rank | poster | text */}
              <span
                className={`w-7 shrink-0 text-center font-display text-lg sm:w-8 sm:text-xl ${
                  idx < 3 ? "text-teal-400" : "text-white/30"
                }`}
              >
                {idx + 1}
              </span>
              <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-800">
                <Image src={a.coverImage.large} alt="" fill sizes="44px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:text-teal-400">{displayTitle(a)}</span>
                <span className="mt-0.5 block truncate text-xs text-white/50">
                  {[a.format, a.episodes && `${a.episodes} eps`, a.averageScore != null && `${(a.averageScore / 10).toFixed(1)} ★`]
                    .filter(Boolean)
                    .join(" • ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}