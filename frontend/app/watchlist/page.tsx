"use client";
// Save as: frontend/app/watchlist/page.tsx
import Image from "next/image";
import Link from "next/link";
import { useWatchlist } from "@/lib/watchlist";

export default function WatchlistPage() {
  const { list, ready, remove, clear } = useWatchlist();

  if (!ready) return null;

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 pb-32 pt-6 sm:px-6 md:pb-16">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">My Watchlist</h1>
          <p className="mt-1 text-sm text-white/50">
            {list.length} saved &middot; kept on this device
          </p>
        </div>
        {list.length > 0 && (
          <button
            type="button"
            onClick={() => window.confirm("Remove every anime from your watchlist?") && clear()}
            className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/20"
          >
            Clear all
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="glass grid place-items-center gap-3 rounded-3xl px-6 py-14 text-center">
          <p className="text-lg font-semibold">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-white/60">
            Open any anime and press <span className="font-semibold text-teal-400">Save</span> to keep it here.
          </p>
          <Link href="/browse/top-airing" className="rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-black hover:brightness-110">
            Browse top airing
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
          {list.map((a) => (
            <li key={a.id} className="group relative min-w-0">
              <Link href={`/anime/${a.slug}`} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-teal-400/60">
                  <Image
                    src={a.cover}
                    alt={a.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-teal-400">{a.title}</p>
                {a.format && <p className="mt-0.5 text-xs text-white/50">{a.format.replace("_", " ")}</p>}
              </Link>

              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label={`Remove ${a.title} from watchlist`}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-red-500 active:scale-90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}