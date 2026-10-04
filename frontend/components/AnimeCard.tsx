import Image from "next/image";
import Link from "next/link";
import { animeSlug, displayTitle, type Anime } from "@/lib/types";

export default function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link
      href={`/anime/${animeSlug(anime)}`}
      className="group relative block overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:ring-teal-400/60 hover:shadow-[0_12px_40px_-8px_rgba(200,255,61,0.25)]"
    >
      <div className="relative aspect-[2/3]" style={{ backgroundColor: anime.coverImage.color ?? undefined }}>
        <Image
          src={anime.coverImage.large}
          alt={displayTitle(anime)}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {anime.averageScore != null && (
          <span className="glass absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold">
            <span className="text-teal-400">&#9733;</span> {(anime.averageScore / 10).toFixed(1)}
          </span>
        )}
        {anime.format && (
          <span className="glass absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
            {anime.format.replace("_", " ")}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 font-display text-sm font-semibold leading-snug">{displayTitle(anime)}</p>
          <p className="mt-1 text-[11px] text-white/60">
            {[anime.seasonYear, anime.episodes && `${anime.episodes} eps`].filter(Boolean).join(" • ")}
          </p>
        </div>
      </div>
    </Link>
  );
}