"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getHistory, removeHistory, type HistoryItem } from "@/lib/history";

export default function WatchHistoryRail() {
  const ref = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [edge, setEdge] = useState({ start: true, end: false });

  const load = () => setItems(getHistory());

  // Read after mount (localStorage does not exist on the server).
  useEffect(() => {
    load();
    window.addEventListener("anicatz-history", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("anicatz-history", load);
      window.removeEventListener("storage", load);
    };
  }, []);

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

  if (items.length === 0) return null;

  const arrow =
    "glass absolute top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-xl transition hover:bg-teal-400 hover:text-black max-md:hidden";

  return (
    <section aria-label="Continue watching" className="min-w-0 max-w-full">
      <h2 className="mb-1 px-3 font-display text-xl font-bold sm:px-4">Continue watching</h2>

      <div className="relative w-full min-w-0 max-w-full">
        {!edge.start && (
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className={`${arrow} left-0`}>
            &lsaquo;
          </button>
        )}

        <div
          ref={ref}
          onScroll={update}
          className="no-scrollbar flex w-full snap-x snap-proximity gap-4 overflow-x-auto overscroll-x-contain pb-5 pl-3 pr-4 pt-3 sm:gap-5 sm:pb-6 sm:pl-4 sm:pr-6"
        >
          {items.map((h) => {
            const pct = h.duration > 0 ? Math.min(100, Math.round((h.time / h.duration) * 100)) : 0;
            return (
              <div key={h.id} className="group relative shrink-0 snap-start">
                <Link href={`/watch/${h.id}/${h.ep}`} className="block">
                  <div className="on-image relative aspect-[2/3] w-28 overflow-hidden rounded-xl text-white ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-teal-400/60 sm:w-36">
                    {h.image && (
                      <Image
                        src={h.image}
                        alt={h.title}
                        fill
                        sizes="(max-width: 640px) 112px, 144px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <p className="text-[10px] font-semibold text-teal-300 sm:text-xs">Episode {h.ep}</p>
                      <p className="line-clamp-2 font-display text-[11px] leading-snug sm:text-xs">{h.title}</p>
                    </div>
                    {pct > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                        <div className="h-full bg-teal-400" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${h.title} from history`}
                  onClick={() => removeHistory(h.id)}
                  className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-sm text-white opacity-100 transition hover:bg-red-500 md:opacity-0 md:group-hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        {!edge.end && (
          <button onClick={() => scroll(1)} aria-label="Scroll right" className={`${arrow} right-0`}>
            &rsaquo;
          </button>
        )}
      </div>
    </section>
  );
}