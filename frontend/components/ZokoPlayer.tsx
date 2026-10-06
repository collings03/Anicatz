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

const SyncIcon = () => (
  <svg {...icon}>
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <path d="M7 11h3l1.5-2.5 2 5L15 11h2" />
  </svg>
);

type RGB = [number, number, number];
const clamp = (n: number) => Math.max(0, Math.min(255, n));
// Slightly more vivid than the raw pixels so the glow reads well around the video.
const vivid = (c: RGB): RGB => c.map((v) => clamp((v - 128) * 1.3 + 138)) as RGB;
const css = (c: RGB) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

const hexOf = (c: string) => {
  const h = c.replace("#", "");
  return /^[0-9a-f]{6}$/i.test(h) ? h : "35d5bf";
};

export default function ZokoPlayer({ malId, episode, totalEpisodes, onEpisodeChange, color = "35d5bf" }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null); // holds the --amb-* colour variables
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [track, setTrack] = useState<Track>("sub");
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [reload, setReload] = useState(0); // bumped by "Retry" so the iframe really reloads
  const [expanded, setExpanded] = useState(false); // our own full-screen overlay (fallback)
  const [isFs, setIsFs] = useState(false); // real browser fullscreen
  const [isMobile, setIsMobile] = useState(false);
  const [ambient, setAmbient] = useState(true);
  const [syncing, setSyncing] = useState(false); // live colours from the picture (desktop Chrome/Edge)
  const [canSync, setCanSync] = useState(false);

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

  // Live sync needs tab capture, which only works well on desktop Chrome / Edge.
  useEffect(() => {
    setCanSync(
      !!navigator.mediaDevices?.getDisplayMedia &&
        /Chrome|Edg\//.test(navigator.userAgent) &&
        !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
  }, []);

  const resetColors = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    ["top", "right", "bottom", "left", "avg"].forEach((k) => el.style.setProperty(`--amb-${k}`, `#${hex}`));
  }, [hex]);

  const stopSync = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setSyncing(false);
    resetColors();
  }, [resetColors]);

  useEffect(() => stopSync, [stopSync]); // stop capturing when the player goes away

  const startSync = async () => {
    try {
      // The browser asks the viewer to share THIS tab. Nothing is recorded or uploaded:
      // the frames are only sampled on this device to pick edge colours.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 10 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      } as unknown as DisplayMediaStreamOptions);
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", stopSync);

      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.srcObject = stream;
      await v.play();

      const W = 32;
      const H = 18;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return stopSync();

      const cur: Record<string, RGB> = { top: [0, 0, 0], right: [0, 0, 0], bottom: [0, 0, 0], left: [0, 0, 0] };
      let first = true;

      timerRef.current = window.setInterval(() => {
        const el = box.current;
        const root = wrap.current;
        if (!el || !root || !v.videoWidth || document.hidden) return;
        if (document.fullscreenElement || el.classList.contains("fixed")) return; // glow is hidden there

        // Map the player's on-screen rectangle onto the captured frame.
        const r = el.getBoundingClientRect();
        const k = v.videoWidth / window.innerWidth;
        const sx = Math.max(0, r.left * k);
        const sy = Math.max(0, r.top * k);
        const sw = Math.min(r.width * k, v.videoWidth - sx);
        const sh = Math.min(r.height * k, v.videoHeight - sy);
        if (sw < 16 || sh < 16) return; // scrolled out of view

        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
        const px = ctx.getImageData(0, 0, W, H).data;

        const edge = (test: (x: number, y: number) => boolean): RGB => {
          let r0 = 0, g0 = 0, b0 = 0, n = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              if (!test(x, y)) continue;
              const i = (y * W + x) * 4;
              r0 += px[i]; g0 += px[i + 1]; b0 += px[i + 2]; n++;
            }
          }
          return n ? [r0 / n, g0 / n, b0 / n] : [0, 0, 0];
        };

        const target: Record<string, RGB> = {
          top: edge((_, y) => y < 3),
          bottom: edge((_, y) => y >= H - 3),
          left: edge((x) => x < 3),
          right: edge((x) => x >= W - 3),
        };

        let ar = 0, ag = 0, ab = 0;
        for (const name of Object.keys(target)) {
          const c = cur[name];
          const t = target[name];
          const f = first ? 1 : 0.3; // ease towards the new colour so it never flickers
          c[0] += (t[0] - c[0]) * f;
          c[1] += (t[1] - c[1]) * f;
          c[2] += (t[2] - c[2]) * f;
          const out = vivid(c);
          root.style.setProperty(`--amb-${name}`, css(out));
          ar += out[0]; ag += out[1]; ab += out[2];
        }
        root.style.setProperty("--amb-avg", css([ar / 4, ag / 4, ab / 4]));
        first = false;
      }, 120);

      setSyncing(true);
    } catch {
      stopSync(); // viewer cancelled the prompt, or the browser refused
    }
  };

  const toggleAmbient = () =>
    setAmbient((v) => {
      try {
        localStorage.setItem(AMBIENT_KEY, v ? "off" : "on");
      } catch {}
      if (v) stopSync();
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
        @keyframes ambient-breathe{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.04)}}
        .ambient-pulse{animation:ambient-breathe 8s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.ambient-pulse{animation:none;opacity:.5}}
      `}</style>

      {/* VIDEO (with the ambient glow behind it) */}
      <div
        ref={wrap}
        className="relative isolate"
        style={
          {
            "--amb-top": `#${hex}`,
            "--amb-right": `#${hex}`,
            "--amb-bottom": `#${hex}`,
            "--amb-left": `#${hex}`,
            "--amb-avg": `#${hex}`,
          } as React.CSSProperties
        }
      >
        {ambient && !inFullscreen && (
          <div
            aria-hidden
            className={`pointer-events-none absolute -inset-2 -z-10 sm:-inset-5 ${syncing ? "opacity-80" : "ambient-pulse"}`}
          >
            <div className="absolute inset-x-6 -top-1 h-1/2 rounded-full blur-2xl sm:blur-3xl" style={{ background: "var(--amb-top)" }} />
            <div className="absolute inset-x-6 -bottom-1 h-1/2 rounded-full blur-2xl sm:blur-3xl" style={{ background: "var(--amb-bottom)" }} />
            <div className="absolute inset-y-6 -left-1 w-1/3 rounded-full blur-2xl sm:blur-3xl" style={{ background: "var(--amb-left)" }} />
            <div className="absolute inset-y-6 -right-1 w-1/3 rounded-full blur-2xl sm:blur-3xl" style={{ background: "var(--amb-right)" }} />
          </div>
        )}

        <div
          ref={box}
          className={
            expanded
              ? "fixed inset-0 z-[10001] h-[100dvh] w-screen overflow-hidden bg-black"
              : "relative aspect-video overflow-hidden rounded-xl bg-black transition-shadow duration-300"
          }
          style={
            ambient && !expanded
              ? { boxShadow: "0 0 0 2px var(--amb-avg), 0 0 28px -6px var(--amb-avg)" }
              : undefined
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

          {/* Desktop Chrome / Edge only: colours follow the actual picture */}
          {canSync && ambient && (
            <button
              type="button"
              onClick={syncing ? stopSync : startSync}
              aria-pressed={syncing}
              className={`${action} ${syncing ? "!border-teal-400 !bg-teal-400 !text-black" : ""}`}
            >
              <SyncIcon />
              <span>{syncing ? "Stop sync" : "Sync with video"}</span>
            </button>
          )}
        </div>
        {syncing && (
          <p className="text-xs text-white/50">
            Sync is on: your browser shows a &quot;sharing this tab&quot; notice. Nothing is recorded or uploaded.
          </p>
        )}
      </div>
    </div>
  );
}