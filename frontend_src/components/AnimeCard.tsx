import Image from "next/image";
import Link from "next/link";
import { displayTitle, type Anime } from "@/lib/types";

export default function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link href={`/anime/${anime.id}`} className="group block">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800"
        style={{ backgroundColor: anime.coverImage.color ?? undefined }}
      >
        <Image
          src={anime.coverImage.large}
          alt={displayTitle(anime)}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {anime.averageScore != null && (
          <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {anime.averageScore}%
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-neutral-100">{displayTitle(anime)}</p>
      <p className="text-xs text-neutral-400">
        {[anime.format, anime.seasonYear].filter(Boolean).join(" • ")}
      </p>
    </Link>
  );
}
