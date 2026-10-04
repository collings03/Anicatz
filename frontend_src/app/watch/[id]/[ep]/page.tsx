import Link from "next/link";
import { notFound } from "next/navigation";
import WatchClient from "@/components/WatchClient";
import { getAnime } from "@/lib/api";
import { availableEpisodes, displayTitle } from "@/lib/types";

export default async function WatchPage({ params }: { params: Promise<{ id: string; ep: string }> }) {
  const { id, ep } = await params;
  const anime = await getAnime(id).catch(() => null);
  if (!anime) notFound();

  const total = availableEpisodes(anime);
  const episode = Number(ep);
  if (!anime.idMal || !Number.isInteger(episode) || episode < 1 || episode > total) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Link href={`/anime/${anime.id}`} className="text-sm text-neutral-400 hover:text-white">
        &larr; {displayTitle(anime)}
      </Link>
      <WatchClient animeId={anime.id} malId={anime.idMal} episode={episode} total={total} />
    </main>
  );
}
