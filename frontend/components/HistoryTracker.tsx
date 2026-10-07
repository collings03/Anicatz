"use client";
import { useEffect } from "react";
import { getHistory, saveHistory } from "@/lib/history";

/** Records the episode in "Continue watching" when the watch page opens. Renders nothing. */
export default function HistoryTracker({
  slug,
  episode,
  title,
  image,
}: {
  slug: string;
  episode: number;
  title: string;
  image: string | null;
}) {
  useEffect(() => {
    // Keep the saved time if the viewer reopens the same episode.
    const old = getHistory().find((h) => String(h.id) === slug && String(h.ep) === String(episode));
    saveHistory({
      id: slug,
      ep: episode,
      title,
      image,
      time: old?.time ?? 0,
      duration: old?.duration ?? 0,
    });
  }, [slug, episode, title, image]);

  return null;
}
