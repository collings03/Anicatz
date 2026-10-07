"use client";
// Save as: frontend/components/WatchlistButton.tsx
import { useWatchlist, type SavedAnime } from "@/lib/watchlist";

const Bookmark = ({ filled }: { filled: boolean }) => (
  <svg
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </svg>
);

export default function WatchlistButton({
  anime,
  variant = "full",
  className = "",
}: {
  anime: SavedAnime;
  /** "full": labelled button for the anime page. "icon": small round button to overlay on a poster card. */
  variant?: "full" | "icon";
  className?: string;
}) {
  const { has, toggle, ready } = useWatchlist();
  const saved = ready && has(anime.id);

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
        onClick={(e) => {
          // Cards are links: don't open the anime when saving.
          e.preventDefault();
          e.stopPropagation();
          toggle(anime);
        }}
        className={`grid h-8 w-8 place-items-center rounded-full backdrop-blur transition active:scale-90 ${
          saved ? "bg-teal-400 text-black" : "bg-black/60 text-white hover:bg-black/80"
        } ${className}`}
      >
        <Bookmark filled={saved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => toggle(anime)}
      className={`flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition active:scale-[0.98] sm:flex-none sm:px-6 ${
        saved ? "bg-teal-400 text-black" : "glass hover:bg-white/10"
      } ${className}`}
    >
      <Bookmark filled={saved} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}