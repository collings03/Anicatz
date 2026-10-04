"use client";
import Link from "next/link";
import { useState } from "react";
import { GENRES } from "@/lib/categories";

const SHOWN = 10; // chips visible before "Show all"

export default function GenreBox() {
  const [all, setAll] = useState(false);
  const list = all ? GENRES : GENRES.slice(0, SHOWN);
  const hidden = GENRES.length - SHOWN;

  return (
    <section className="glass w-full min-w-0 rounded-2xl p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold sm:text-base">Genres</h2>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="shrink-0 text-xs text-teal-400 hover:underline"
          >
            {all ? "Show less" : `Show all (${GENRES.length})`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {list.map((g) => (
          <Link
            key={g}
            href={`/genre/${encodeURIComponent(g)}`}
            className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:text-black hover:ring-teal-400 sm:text-xs"
          >
            {g}
          </Link>
        ))}
      </div>
    </section>
  );
}