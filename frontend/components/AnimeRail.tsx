"use client";
import { useEffect, useRef, useState } from "react";
import AnimeCard from "@/components/AnimeCard";
import type { Anime } from "@/lib/types";

export default function AnimeRail({ items }: { items: Anime[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = () => {
    const s = ref.current;
    if (!s) return;
    setEdge({
      start: s.scrollLeft <= 2,
      end: s.scrollLeft + s.clientWidth >= s.scrollWidth - 2,
    });
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [items.length]);

  const scroll = (dir: number) => {
    const s = ref.current;
    if (s) s.scrollBy({ left: dir * s.clientWidth * 0.8, behavior: "smooth" });
  };

  // Arrows are for mouse users; on phones you just swipe.
  const arrow =
    "glass absolute top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-xl transition hover:bg-teal-400 hover:text-black max-md:hidden";

  return (
    <div className="relative w-full min-w-0 max-w-full">
      {!edge.start && (
        <button onClick={() => scroll(-1)} aria-label="Scroll left" className={`${arrow} left-0`}>
          &lsaquo;
        </button>
      )}

      <div
        ref={ref}
        onScroll={update}
        className="no-scrollbar flex w-full snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-3 sm:gap-4"
      >
        {items.map((a) => (
          <div key={a.id} className="w-36 shrink-0 snap-start sm:w-44 lg:w-48">
            <AnimeCard anime={a} />
          </div>
        ))}
      </div>

      {!edge.end && (
        <button onClick={() => scroll(1)} aria-label="Scroll right" className={`${arrow} right-0`}>
          &rsaquo;
        </button>
      )}
    </div>
  );
}