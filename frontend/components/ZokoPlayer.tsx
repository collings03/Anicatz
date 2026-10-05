"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const BASE =
  process.env.NEXT_PUBLIC_VIDEO_PROVIDER_BASE_URL ??
  "https://zokoanime.video";

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

export default function ZokoPlayer({
  malId,
  episode,
  totalEpisodes,
  onEpisodeChange,
  color = "35d5bf",
}: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const [track, setTrack] = useState<Track>("sub");
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /*
   * Detect mobile.
   */
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.matchMedia("(max-width: 768px)").matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(
          navigator.userAgent
        );

      setIsMobile(mobile);
    };

    checkMobile();

    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  /*
   * Video URL.
   */
  const src = useMemo(() => {
    return `${BASE}/stream/mal/${malId}/${episode}/${track}?color=${color.replace(
      "#",
      ""
    )}`;
  }, [malId, episode, track, color]);

  /*
   * Reset error whenever episode/track changes.
   */
  useEffect(() => {
    setFailed(false);
  }, [src]);

  /*
   * Listen for messages from the provider.
   */
  useEffect(() => {
    let origin: string;

    try {
      origin = new URL(BASE).origin;
    } catch {
      return;
    }

    function onMessage(e: MessageEvent) {
      /*
       * Only accept messages from our video provider.
       */
      if (
        e.origin !== origin ||
        e.source !== ref.current?.contentWindow
      ) {
        return;
      }

      let data = e.data;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      const type = data?.type ?? data?.event;

      /*
       * Automatically move to next episode.
       */
      if (
        type === "complete" &&
        episode < totalEpisodes
      ) {
        onEpisodeChange(episode + 1);
      }

      /*
       * Provider error.
       */
      if (type === "error") {
        setFailed(true);
      }
    }

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [
    episode,
    totalEpisodes,
    onEpisodeChange,
  ]);

  /*
   * Expanded fullscreen mode.
   */
  useEffect(() => {
    if (!expanded) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  /*
   * Fullscreen.
   */
  const toggleFullscreen = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    const el = box.current as
      | (HTMLDivElement & {
          webkitRequestFullscreen?: () => void;
        })
      | null;

    try {
      /*
       * Standard fullscreen.
       */
      if (el?.requestFullscreen) {
        await el.requestFullscreen();

        /*
         * Try landscape on mobile.
         */
        if (isMobile) {
          try {
            await (
              screen.orientation as ScreenOrientation & {
                lock?: (
                  orientation: string
                ) => Promise<void>;
              }
            ).lock?.("landscape");
          } catch {
            // Not supported by all mobile browsers.
          }
        }

        return;
      }

      /*
       * Safari fullscreen.
       */
      if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return;
      }
    } catch {
      // Browser refused fullscreen.
    }

    /*
     * Fallback fullscreen.
     */
    setExpanded(true);
  }, [expanded, isMobile]);

  /*
   * Reload player.
   */
  const retry = () => {
    setFailed(false);
    setReload((n) => n + 1);
  };

  return (
    <div className="w-full">
      {/* VIDEO PLAYER */}
      <div
        ref={box}
        className={
          expanded
            ? "fixed inset-0 z-[10001] h-[100dvh] w-screen overflow-hidden bg-black"
            : "relative aspect-video overflow-hidden rounded-lg bg-black"
        }
      >
        <iframe
          key={`${src}|${reload}`}
          ref={ref}
          src={src}
          title={`Episode ${episode}`}
          allow="fullscreen; autoplay; picture-in-picture; encrypted-media"
          allowFullScreen
          /*
           * IMPORTANT:
           *
           * NO sandbox attribute.
           *
           * ZokoAnime detects sandboxed iframes
           * and returns "EMBED BLOCKED".
           */
          className="absolute inset-0 h-full w-full border-0"
        />

        {/* CLOSE FULLSCREEN */}
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

        {/* ERROR */}
        {failed && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-black/85 p-3 text-sm text-white">
            This episode didn&apos;t load.{" "}
            <button
              type="button"
              className="underline"
              onClick={retry}
            >
              Retry
            </button>
            {" or switch track."}
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {/* PREVIOUS */}
        <button
          type="button"
          disabled={episode <= 1}
          onClick={() =>
            onEpisodeChange(episode - 1)
          }
          className="rounded border border-neutral-600 px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>

        {/* EPISODE */}
        <span>
          Episode {episode} of {totalEpisodes}
        </span>

        {/* NEXT */}
        <button
          type="button"
          disabled={
            episode >= totalEpisodes
          }
          onClick={() =>
            onEpisodeChange(episode + 1)
          }
          className="rounded border border-neutral-600 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>

        {/* FULLSCREEN */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Full screen"
          className="rounded border border-neutral-600 px-3 py-1.5"
        >
          Full screen
        </button>

        {/* TRACKS */}
        <div
          className="ml-auto flex gap-1"
          role="group"
          aria-label="Audio and subtitle track"
        >
          {TRACKS.map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={track === t}
              onClick={() => {
                setFailed(false);
                setTrack(t);
              }}
              className={`rounded border px-3 py-1.5 ${
                track === t
                  ? "border-lime-400 bg-lime-400 text-black"
                  : "border-neutral-600"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE INFORMATION */}
      {isMobile && (
        <p className="mt-2 text-xs text-white/40">
          Mobile player mode enabled.
        </p>
      )}
    </div>
  );
}