import AnimeCard from "./AnimeCard";
import type { Anime } from "@/lib/types";

export default function AnimeGrid({
  items,
  cols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
  mobileRail = false,
}: {
  items: Anime[];
  cols?: string;
  /** Phones: one sideways-scrolling row (Netflix style). Tablets and up: the normal grid. */
  mobileRail?: boolean;
}) {
  if (!items.length) return <p className="text-neutral-400">No results.</p>;

  if (!mobileRail) {
    return (
      <div className={`grid gap-4 ${cols}`}>
        {items.map((a) => (
          <AnimeCard key={a.id} anime={a} />
        ))}
      </div>
    );
  }

  return (
    // Below sm: a flex row that scrolls sideways and snaps card by card.
    // From sm up: becomes the same grid as before (sm:grid + the cols classes).
    <div
      className={`no-scrollbar w-full min-w-0 max-w-full snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-2 max-sm:flex sm:grid sm:gap-4 sm:overflow-visible sm:pb-0 ${cols}`}
    >
      {items.map((a) => (
        <div key={a.id} className="w-[8.5rem] shrink-0 snap-start min-[400px]:w-36 sm:w-auto sm:shrink">
          <AnimeCard anime={a} />
        </div>
      ))}
    </div>
  );
}