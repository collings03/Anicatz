"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animeSlug, availableEpisodes, displayTitle, stripHtml, type Anime } from "@/lib/types";

export default function Spotlight({ items }: { items: Anime[] }) {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length, i]); // restarts the timer after a manual change

  if (!items.length) return null;
  const go = (d: number) => setI((n) => (n + d + items.length) % items.length);

  // Swipe left/right on phones
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    // "on-image" keeps the text white in light mode, since it always sits on a photo with a dark overlay.
    <section
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="on-image relative -mt-24 h-[66svh] min-h-[420px] w-full overflow-hidden text-white sm:h-[82vh] sm:min-h-[520px]"
    >
      {items.map((a, idx) => {
        const canWatch = a.idMal && availableEpisodes(a) > 0;
        const meta = [a.format, a.episodes && `${a.episodes} eps`, a.seasonYear, a.status?.replaceAll("_", " ")].filter(Boolean);
        return (
          <div
            key={a.id}
            aria-hidden={idx !== i}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {/* Photo + overlays. The mask fades this layer to transparent at the bottom, so the real page
                background shows through: it blends with whatever is behind it, in dark or light mode. */}
            <div
              className="absolute inset-0"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - clamp(6rem, 24%, 12rem)), transparent 100%)",
                maskImage: "linear-gradient(to bottom, #000 calc(100% - clamp(6rem, 24%, 12rem)), transparent 100%)",
              }}
            >
              {/* Banner, or the cover blurred when there is no banner */}
              {a.bannerImage ? (
                <Image
                  src={a.bannerImage}
                  alt=""
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="object-cover object-[65%_center] sm:object-center"
                />
              ) : (
                <Image
                  src={a.coverImage.extraLarge}
                  alt=""
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="scale-110 object-cover opacity-60 blur-2xl"
                />
              )}

              {/* Legibility overlays: left-to-right on wide screens, bottom-up on phones */}
              <div className="absolute inset-0 hidden bg-gradient-to-r from-black via-black/60 to-transparent sm:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10 sm:from-black/60 sm:via-transparent sm:to-transparent" />
            </div>

            {/* Text */}
            <div className="absolute inset-x-0 bottom-16 space-y-2.5 px-4 sm:bottom-10 sm:right-auto sm:max-w-2xl sm:space-y-3 sm:px-10">
              <p className="text-xs font-semibold text-teal-400 sm:text-sm">#{idx + 1} Spotlight</p>
              <h1 className="line-clamp-2 break-words font-display text-xl min-[400px]:text-2xl font-bold leading-tight sm:line-clamp-none sm:text-4xl lg:text-5xl">
                {displayTitle(a)}
              </h1>
              <div className="flex flex-wrap gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
                {meta.map((m) => (
                  <span key={String(m)} className="rounded bg-white/15 px-2 py-1 backdrop-blur-sm">{m}</span>
                ))}
              </div>
              <p className="line-clamp-2 text-[13px] leading-relaxed text-neutral-300 sm:line-clamp-3 sm:text-sm">
                {stripHtml(a.description)}
              </p>
              <div className="flex gap-3 pt-1">
                {canWatch && (
                  <Link
                    href={`/watch/${animeSlug(a)}/1`}
                    className="min-w-0 flex-1 rounded-full bg-teal-400 px-5 py-2.5 text-center text-sm font-semibold text-black sm:flex-none sm:px-6 sm:py-2"
                  >
                    Watch now
                  </Link>
                )}
                <Link
                  href={`/anime/${animeSlug(a)}`}
                  className="min-w-0 flex-1 rounded-full bg-white/15 px-5 py-2.5 text-center text-sm backdrop-blur-sm hover:bg-white/25 sm:flex-none sm:px-6 sm:py-2"
                >
                  Detail
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Arrows: desktop and tablet only (phones swipe) */}
      <div className="absolute bottom-10 right-6 hidden gap-2 sm:flex sm:right-10">
        <button onClick={() => go(-1)} aria-label="Previous slide" className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30">&lsaquo;</button>
        <button onClick={() => go(1)} aria-label="Next slide" className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30">&rsaquo;</button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-4">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1.5 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] transition-all ${idx === i ? "w-6 bg-teal-400" : "w-3 bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}