"use client";

import { useRouter } from "next/navigation";
import ZokoPlayer from "./ZokoPlayer";

export default function WatchClient(props: {
  slug: string;
  malId: number;
  aniId: number;
  episode: number;
  total: number;
  color?: string | null;
  hasDub?: boolean;
}) {
  const router = useRouter();

  return (
    <ZokoPlayer
      malId={props.malId}
      aniId={props.aniId}
      episode={props.episode}
      totalEpisodes={props.total}
      color={props.color ?? undefined}
      hasDub={props.hasDub ?? false}
      onEpisodeChange={(ep) =>
        router.push(
          `/watch/${props.slug}/${ep}`
        )
      }
    />
  );
}