"use client";
import { useRouter } from "next/navigation";
import ZokoPlayer from "./ZokoPlayer";

export default function WatchClient(props: {
  slug: string;
  malId: number;
  episode: number;
  total: number;
  /** Anime colour, e.g. anime.coverImage.color. Drives the ambient glow. Optional. */
  color?: string | null;
}) {
  const router = useRouter();
  return (
    <ZokoPlayer
      malId={props.malId}
      episode={props.episode}
      totalEpisodes={props.total}
      color={props.color ?? undefined}
      onEpisodeChange={(ep) => router.push(`/watch/${props.slug}/${ep}`)}
    />
  );
}