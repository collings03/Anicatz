"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const FullscreenIcon = ({ exit }: { exit: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 shrink-0"
    aria-hidden
  >
    {exit ? (
      <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
    ) : (
      <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
    )}
  </svg>
);

export default function ZokoPlayer({ malId, episode, totalEpisodes, onEpisodeChange, color = "35d5bf" }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const [track, setTrack] = useState<Track>("sub");
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0); // bumped by "Retry" so the iframe really reloads
  const [expanded, setExpanded] = useState(false); // our own full-screen overlay (fallback)
  const [isFs, setIsFs] = useState(false); // real browser fullscreen
  const [isMobile, setIsMobile] = useState(false);

  // Detect phones (used to try landscape in fullscreen).
  useEffect(() => {
    const check = () =>
      setIsMobile(
        window.matchMedia("(max-width: 768px)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const src = useMemo(
    () => `${BASE}/stream/mal/${malId}/${episode}/${track}?color=${color.replace("#", "")}`,
    [malId, episode, track, color]
  );

  // Reset the error whenever the episode or track changes.
  useEffect(() => setFailed(false), [src]);

  // Messages from the provider (episode finished / error).
  useEffect(() => {
    let origin: string;
    try {
      origin = new URL(BASE).origin;
    } catch {
      return;
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== origin || e.source !== ref.current?.contentWindow) return;

      let data = e.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      const type = data?.type ?? data?.event;
      if (type === "complete" && episode < totalEpisodes) onEpisodeChange(episode + 1);
      if (type === "error") setFailed(true);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [episode, totalEpisodes, onEpisodeChange]);

  // Keep the button label right when the browser enters/leaves real fullscreen (Esc, back gesture...).
  useEffect(() => {
    const onChange = () => setIsFs(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Our own full-screen overlay: lock page scroll, Esc closes.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const toggleFullscreen = useCallback(async () => {
    if (expanded) return setExpanded(false);
    if (document.fullscreenElement) return void (await document.exitFullscreen());

    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    try {
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
        if (isMobile) {
          try {
            await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
          } catch {
            // Not supported by every mobile browser.
          }
        }
        return;
      }
      if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return;
      }
    } catch {
      // Browser refused real fullscreen: use the overlay below.
    }
    setExpanded(true);
  }, [expanded, isMobile]);

  const retry = () => {
    setFailed(false);
    setReload((n) => n + 1);
  };

  const inFullscreen = expanded || isFs;

  return (
    <div className="w-full">
      {/* VIDEO */}
      <div
        ref={box}
        className={
          expanded
            ? "fixed inset-0 z-[10001] h-[100dvh] w-screen overflow-hidden bg-black"
            : "relative aspect-video overflow-hidden rounded-lg bg-black"
        }
      >
        {/* No sandbox attribute: zokoanime.video detects sandboxed iframes and shows "EMBED BLOCKED". */}
        <iframe
          key={`${src}|${reload}`}
          ref={ref}
          src={src}
          title={`Episode ${episode}`}
          allow="fullscreen; autoplay; picture-in-picture; encrypted-media"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />

        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Exit full screen"
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20"
          >
            Close
          </button>
        )}

        {failed && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-black/85 p-3 text-sm text-white">
            This episode didn&apos;t load.{" "}
            <button type="button" className="underline" onClick={retry}>
              Retry
            </button>
            {" or switch track."}
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="mt-3 space-y-2 text-sm">
        {/* Row 1: previous / episode / next */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={episode <= 1}
            onClick={() => onEpisodeChange(episode - 1)}
            className="shrink-0 rounded border border-neutral-600 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="min-w-0 truncate text-center">
            Episode {episode} of {totalEpisodes}
          </span>
          <button
            type="button"
            disabled={episode >= totalEpisodes}
            onClick={() => onEpisodeChange(episode + 1)}
            className="shrink-0 rounded border border-neutral-600 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>

        {/* Row 2: full screen (never shrinks) + tracks */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={inFullscreen ? "Exit full screen" : "Full screen"}
            className="flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-600 px-4 py-2 text-sm font-semibold"
          >
            <FullscreenIcon exit={inFullscreen} />
            {inFullscreen ? "Exit full screen" : "Full screen"}
          </button>

          <div className="ml-auto flex shrink-0 gap-1" role="group" aria-label="Audio and subtitle track">
            {TRACKS.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={track === t}
                onClick={() => {
                  setFailed(false);
                  setTrack(t);
                }}
                className={`min-h-[44px] rounded border px-3 py-1.5 ${
                  track === t ? "border-teal-400 bg-teal-400 text-black" : "border-neutral-600"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}