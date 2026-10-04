import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnime } from "@/lib/api";
import { availableEpisodes, displayTitle, stripHtml } from "@/lib/types";

export default async function AnimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const anime = await getAnime(id).catch(() => null);
  if (!anime) notFound();

  const eps = availableEpisodes(anime);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">&larr; Back</Link>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-lg">
          <Image src={anime.coverImage.extraLarge} alt={displayTitle(anime)} fill sizes="192px" className="object-cover" priority />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{displayTitle(anime)}</h1>
          <p className="text-sm text-neutral-400">
            {[anime.format, anime.seasonYear, anime.status?.replaceAll("_", " "), anime.averageScore != null && `${anime.averageScore}%`]
              .filter(Boolean).join(" • ")}
          </p>
          <div className="flex flex-wrap gap-2">
            {anime.genres.map((g) => (
              <span key={g} className="rounded-full bg-neutral-800 px-3 py-1 text-xs">{g}</span>
            ))}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">{stripHtml(anime.description)}</p>
          {anime.idMal && eps > 0 ? (
            <Link href={`/watch/${anime.id}/1`} className="inline-block rounded-md bg-teal-400 px-5 py-2 font-semibold text-black">
              Watch episode 1
            </Link>
          ) : (
            <p className="text-sm text-neutral-500">No episodes available to watch yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
