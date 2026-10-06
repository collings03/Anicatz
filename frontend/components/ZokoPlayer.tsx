"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_VIDEO_PROVIDER_BASE_URL ?? "https://zokoanime.video";

const TRACKS = ["sub", "hsub", "dub"] as const;
type Track = (typeof TRACKS)[number];

const AMBIENT_KEY = "anicatz-ambient";
const SLOW_MS = 12000; // show Retry if the player hasn't loaded after this long

type Props = {
  malId: number;
  episode: number;
  totalEpisodes: number;
  /** Called when the viewer picks another episode or an episode finishes. */
  onEpisodeChange: (ep: number) => void;
  /** Accent colour of the anime (hex, with or without #). Also drives the ambient glow. */
  color?: string;
};

const icon = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-5 w-5 shrink-0",
  "aria-hidden": true,
} as const;

const FullscreenIcon = ({ exit }: { exit: boolean }) => (
  <svg {...icon}>
    {exit ? (
      <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
    ) : (
      <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
    )}
  </svg>
);

const RetryIcon = () => (
  <svg {...icon}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v6h-6" />
  </svg>
);

const AmbientIcon = () => (
  <svg {...icon}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const hexOf = (c: string) => {
  const h = c.replace("#", "");
  return /^[0-9a-f]{6}$/i.test(h) ? h : "35d5bf";
};

export default function ZokoPlayer({ malId, episode, totalEpisodes, onEpisodeChange, color = "35d5bf" }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const [track, setTrack] = useState<Track>("sub");
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [reload, setReload] = useState(0); // bumped by "Retry" so the iframe really reloads
  const [expanded, setExpanded] = useState(false); // our own full-screen overlay (fallback)
  const [isFs, setIsFs] = useState(false); // real browser fullscreen
  const [isMobile, setIsMobile] = useState(false);
  const [ambient, setAmbient] = useState(true);

  const hex = hexOf(color);

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

  // Ambient mode: remembered per viewer; off by default for people who prefer reduced motion.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AMBIENT_KEY);
      if (saved) return setAmbient(saved === "on");
    } catch {}
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAmbient(false);
  }, []);

  const toggleAmbient = () =>
    setAmbient((v) => {
      try {
        localStorage.setItem(AMBIENT_KEY, v ? "off" : "on");
      } catch {}
      return !v;
    });

  const src = useMemo(
    () => `${BASE}/stream/mal/${malId}/${episode}/${track}?color=${hex}`,
    [malId, episode, track, hex]
  );

  // Reset the error whenever the episode or track changes.
  useEffect(() => setFailed(false), [src]);

  // Every (re)load starts a timer: if the player is still not loaded, offer Retry.
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [src, reload]);

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
  const showProblem = failed || (!loaded && slow);

  const btn =
    "flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-neutral-600 bg-white/5 px-3 font-semibold transition active:scale-[0.98] disabled:opacity-40";
  // Phones: icon above a small label. Larger screens: icon and label side by side.
  const action =
    "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border border-neutral-600 bg-white/5 px-2 py-1.5 text-[11px] font-semibold leading-tight transition active:scale-[0.98] md:min-h-[44px] md:flex-row md:gap-2 md:px-4 md:text-sm";

  return (
    <div className="w-full">
      <style>{`
        @keyframes ambient-breathe{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.65;transform:scale(1.05)}}
        .ambient-a{animation:ambient-breathe 7s ease-in-out infinite}
        .ambient-b{animation:ambient-breathe 9s ease-in-out infinite reverse}
        @media (prefers-reduced-motion: reduce){.ambient-a,.ambient-b{animation:none;opacity:.45}}
      `}</style>

      {/* VIDEO (with the ambient glow behind it) */}
      <div className="relative isolate">
        {ambient && !inFullscreen && (
          <div aria-hidden className="pointer-events-none absolute -inset-2 -z-10 sm:-inset-5">
            <div
              className="ambient-a absolute inset-0 rounded-[2rem] blur-2xl sm:blur-3xl"
              style={{ background: `radial-gradient(60% 70% at 25% 50%, #${hex}cc, transparent 70%)` }}
            />
            <div
              className="ambient-b absolute inset-0 rounded-[2rem] blur-2xl sm:blur-3xl"
              style={{ background: `radial-gradient(60% 70% at 75% 50%, #${hex}99, transparent 70%)` }}
            />
          </div>
        )}

        <div
          ref={box}
          className={
            expanded
              ? "fixed inset-0 z-[10001] h-[100dvh] w-screen overflow-hidden bg-black"
              : "relative aspect-video overflow-hidden rounded-xl bg-black"
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
            onLoad={() => {
              setLoaded(true);
              setSlow(false);
            }}
            className="absolute inset-0 h-full w-full border-0"
          />

          {/* Spinner while the player loads */}
          {!loaded && !showProblem && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
            </div>
          )}

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

          {/* Retry, inside the player */}
          {showProblem && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 p-4 text-center text-white">
              <div className="max-w-xs space-y-3">
                <p className="text-sm font-medium">
                  {failed ? "This episode didn't load." : "Taking longer than usual..."}
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="mx-auto flex min-h-[48px] items-center gap-2 rounded-full bg-teal-400 px-6 font-semibold text-black transition active:scale-[0.97]"
                >
                  <RetryIcon /> Retry
                </button>
                <p className="text-xs text-white/60">Still stuck? Try another track below (SUB, HSUB or DUB).</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS (extra bottom space on phones so the fixed bottom bar never covers them) */}
      <div className="mt-4 space-y-3 pb-24 text-sm md:pb-0">
        {/* Previous / episode / next */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            disabled={episode <= 1}
            onClick={() => onEpisodeChange(episode - 1)}
            className={btn}
          >
            <span aria-hidden>&lsaquo;</span> Previous
          </button>
          <span className="px-1 text-center text-sm font-semibold sm:px-3">
            Ep {episode}
            <span className="font-normal text-white/50"> / {totalEpisodes}</span>
          </span>
          <button
            type="button"
            disabled={episode >= totalEpisodes}
            onClick={() => onEpisodeChange(episode + 1)}
            className={btn}
          >
            Next <span aria-hidden>&rsaquo;</span>
          </button>
        </div>

        {/* Track picker: three equal segments on phones */}
        <div
          className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10 md:inline-grid md:w-auto md:min-w-[18rem]"
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
              className={`min-h-[44px] rounded-lg px-3 font-semibold transition ${
                track === t ? "bg-teal-400 text-black" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Full screen / Retry / Ambient */}
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={inFullscreen ? "Exit full screen" : "Full screen"}
            className={action}
          >
            <FullscreenIcon exit={inFullscreen} />
            <span>{inFullscreen ? "Exit" : "Full screen"}</span>
          </button>

          <button type="button" onClick={retry} aria-label="Reload the player" className={action}>
            <RetryIcon />
            <span>Retry</span>
          </button>

          <button
            type="button"
            onClick={toggleAmbient}
            aria-pressed={ambient}
            aria-label="Ambient mode"
            className={`${action} ${ambient ? "!border-teal-400 !bg-teal-400 !text-black" : ""}`}
          >
            <AmbientIcon />
            <span>Ambient {ambient ? "on" : "off"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}