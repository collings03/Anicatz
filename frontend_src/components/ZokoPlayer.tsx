"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_VIDEO_PROVIDER_BASE_URL ?? "https://zokoanime.video";
const TRACKS = ["sub", "hsub", "dub"] as const;
type Track = (typeof TRACKS)[number];

type Props = {
  malId: number;
  episode: number;
  totalEpisodes: number;
  /** Called when the viewer picks another episode or an episode finishes. */
  onEpisodeChange: (ep: number) => void;
  color?: string;
};

export default function ZokoPlayer({ malId, episode, totalEpisodes, onEpisodeChange, color = "35d5bf" }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [track, setTrack] = useState<Track>("sub");
  const [failed, setFailed] = useState(false);

  const src = useMemo(
    () => `${BASE}/stream/mal/${malId}/${episode}/${track}?color=${color.replace("#", "")}`,
    [malId, episode, track, color]
  );

  useEffect(() => setFailed(false), [src]);

  // Provider posts progress / complete / error. Payload shape is not publicly
  // documented, so read the event name defensively.
  useEffect(() => {
    const origin = new URL(BASE).origin;
    function onMessage(e: MessageEvent) {
      if (e.origin !== origin || e.source !== ref.current?.contentWindow) return;
      let data = e.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      const type = data?.type ?? data?.event;
      if (type === "complete" && episode < totalEpisodes) onEpisodeChange(episode + 1);
      if (type === "error") setFailed(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [episode, totalEpisodes, onEpisodeChange]);

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <iframe
          key={src}
          ref={ref}
          src={src}
          title={`Episode ${episode}`}
          allow="fullscreen; autoplay"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
        {failed && (
          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-sm text-white">
            This episode didn&apos;t load.{" "}
            <button className="underline" onClick={() => setFailed(false)}>Retry</button> or switch track.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          disabled={episode <= 1}
          onClick={() => onEpisodeChange(episode - 1)}
          className="rounded border border-neutral-600 px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>
        <span>Episode {episode} of {totalEpisodes}</span>
        <button
          disabled={episode >= totalEpisodes}
          onClick={() => onEpisodeChange(episode + 1)}
          className="rounded border border-neutral-600 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
        <div className="ml-auto flex gap-1" role="group" aria-label="Audio and subtitle track">
          {TRACKS.map((t) => (
            <button
              key={t}
              aria-pressed={track === t}
              onClick={() => setTrack(t)}
              className={`rounded border px-3 py-1.5 ${track === t ? "border-teal-400 bg-teal-400 text-black" : "border-neutral-600"}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
