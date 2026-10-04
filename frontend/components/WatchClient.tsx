"use client";
import { useRouter } from "next/navigation";
import ZokoPlayer from "./ZokoPlayer";

export default function WatchClient(props: { slug: string; malId: number; episode: number; total: number }) {
  const router = useRouter();
  return (
    <ZokoPlayer
      malId={props.malId}
      episode={props.episode}
      totalEpisodes={props.total}
      onEpisodeChange={(ep) => router.push(`/watch/${props.slug}/${ep}`)}
    />
  );
}