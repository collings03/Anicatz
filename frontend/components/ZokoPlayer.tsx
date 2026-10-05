"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_VIDEO_PROVIDER_BASE_URL ?? "https://zokoanime.video";
// zokoanime.video shows "EMBED BLOCKED" when it runs inside a sandboxed iframe, so popup protection
// is OFF by default. Set NEXT_PUBLIC_PLAYER_SANDBOX=1 only if you switch to a provider that allows it.
const SANDBOX_SUPPORTED = process.env.NEXT_PUBLIC_PLAYER_SANDBOX === "1";
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
  const box = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState<Track>("sub");
  const [failed, setFailed] = useState(false);
  const [protectedMode, setProtectedMode] = useState(SANDBOX_SUPPORTED);
  // Bumped by "Retry" so the iframe actually reloads.
  const [reload, setReload] = useState(0);
  // Full-screen fallback: some phones (iPhone Safari especially) refuse real fullscreen for an iframe,
  // so we stretch the player over the whole screen ourselves, above the navbar and the pinned logo.
  const [expanded, setExpanded] = useState(false);

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

  // While expanded: lock page scroll and let Esc close it.
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
    if (document.fullscreenElement) return void document.exitFullscreen();
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    try {
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
        // Best effort: turn the phone sideways. Not supported everywhere, so ignore failures.
        try {
          await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
        } catch {}
        return;
      }
      if (el?.webkitRequestFullscreen) return void el.webkitRequestFullscreen();
    } catch {}
    setExpanded(true); // real fullscreen not available: use the full-screen overlay instead
  }, [expanded]);

  const retry = () => {
    setFailed(false);
    setReload((n) => n + 1);
  };

  const turnOffProtection = () => {
    setProtectedMode(false);
    setFailed(false);
  };

  return (
    <div>
      <div
        ref={box}
        className={
          expanded
            ? "fixed inset-0 z-[10001] h-[100dvh] w-screen overflow-hidden bg-black"
            : "relative aspect-video overflow-hidden rounded-lg bg-black"
        }
      >
        <iframe
          key={`${src}|${protectedMode ? "safe" : "open"}|${reload}`}
          ref={ref}
          src={src}
          title={`Episode ${episode}`}
          allow="fullscreen *; autoplay; picture-in-picture; encrypted-media"
          allowFullScreen
          sandbox={protectedMode ? "allow-scripts allow-same-origin allow-presentation allow-forms" : undefined}
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
          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-sm text-white">
            This episode didn&apos;t load.{" "}
            <button className="underline" onClick={retry}>Retry</button>
            {protectedMode && (
              <>
                {", "}
                <button className="underline" onClick={turnOffProtection}>try without popup protection</button>
              </>
            )}{" "}
            or switch track.
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
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Full screen"
          className="rounded border border-neutral-600 px-3 py-1.5"
        >
          Full screen
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

      {SANDBOX_SUPPORTED &&
        (protectedMode ? (
          <p className="mt-2 text-xs text-white/40">
            Popup protection is on.{" "}
            <button type="button" onClick={turnOffProtection} className="underline hover:text-white/70">
              Player not loading? Turn it off
            </button>
          </p>
        ) : (
          <p className="mt-2 text-xs text-white/40">
            Popup protection is off.{" "}
            <button type="button" onClick={() => setProtectedMode(true)} className="underline hover:text-white/70">
              Turn it back on
            </button>
          </p>
        ))}
    </div>
  );
}