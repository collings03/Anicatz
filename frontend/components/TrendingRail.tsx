"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animeSlug, displayTitle, type Anime } from "@/lib/types";

export default function TrendingRail({ items }: { items: Anime[] }) {
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
    // min-w-0 + max-w-full: a scrolling row inside a flex/grid parent must not widen the page.
    <div className="relative w-full min-w-0 max-w-full">
      {!edge.start && (
        <button onClick={() => scroll(-1)} aria-label="Scroll left" className={`${arrow} left-0`}>
          &lsaquo;
        </button>
      )}

      <div
        ref={ref}
        onScroll={update}
        className="no-scrollbar flex w-full snap-x snap-proximity gap-4 overflow-x-auto overscroll-x-contain pb-5 pl-3 pr-4 pt-3 sm:gap-8 sm:pb-6 sm:pl-4 sm:pr-6"
      >
        {items.slice(0, 15).map((a, idx) => {
          const rank = idx + 1;
          const wide = rank >= 10;

          return (
            <Link
              key={a.id}
              href={`/anime/${animeSlug(a)}`}
              className="group flex shrink-0 snap-start items-end"
            >
              {/* rank number: slot width depends on digit count so 10-15 are fully visible */}
              <span
                aria-hidden
                className={`outline-num shrink-0 select-none text-center font-display text-[5rem] font-black leading-none sm:text-[7rem] ${
                  wide
                    ? "-mr-3 w-[5.4rem] tracking-[-0.08em] sm:-mr-4 sm:w-[7.4rem]"
                    : "-mr-4 w-[3.1rem] sm:-mr-5 sm:w-[4.2rem]"
                }`}
              >
                {rank}
              </span>

              {/* "on-image": the title sits on a dark gradient, so keep it white in light mode */}
              <div className="on-image relative z-10 aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl text-white ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-teal-400/60 sm:w-36">
                <Image
                  src={a.coverImage.large}
                  alt={displayTitle(a)}
                  fill
                  sizes="(max-width: 640px) 112px, 144px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2">
                  <p className="line-clamp-2 font-display text-[11px] leading-snug sm:text-xs">
                    {displayTitle(a)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!edge.end && (
        <button onClick={() => scroll(1)} aria-label="Scroll right" className={`${arrow} right-0`}>
          &rsaquo;
        </button>
      )}
    </div>
  );
}