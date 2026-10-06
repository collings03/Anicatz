"use client";
// frontend/components/AmbientVideo.tsx
//
// YouTube-style ambient mode: the current video frame is drawn ~15x/sec onto a tiny canvas
// (64x36), stretched behind the player and heavily blurred.
//
// No npm packages needed. Do NOT set crossOrigin on the <video>: drawing a cross-origin
// video onto a canvas works fine for display (only reading pixels back is blocked),
// so the glow works without any permission/CORS setup on the video host.
import { useEffect, useRef, useState } from "react";

const KEY = "anicatz-ambient";
const HLS_CDN = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";

type Props = {
  /** Direct video address: .mp4 or .m3u8 (HLS). */
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
};

// Load hls.js from a CDN once, only if an .m3u8 needs it.
let hlsPromise: Promise<any> | null = null;
function loadHls(): Promise<any> {
  const w = window as any;
  if (w.Hls) return Promise.resolve(w.Hls);
  if (!hlsPromise) {
    hlsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = HLS_CDN;
      s.async = true;
      s.onload = () => (w.Hls ? resolve(w.Hls) : reject(new Error("Hls missing")));
      s.onerror = () => {
        hlsPromise = null;
        reject(new Error("Failed to load hls.js"));
      };
      document.head.appendChild(s);
    });
  }
  return hlsPromise;
}

export default function AmbientVideo({ src, poster, autoPlay = false, onEnded, className = "" }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ambient, setAmbient] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  // Remembered per viewer; off by default for people who prefer reduced motion.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return setAmbient(saved === "on");
    } catch {}
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAmbient(false);
  }, []);

  const toggle = () =>
    setAmbient((v) => {
      try {
        localStorage.setItem(KEY, v ? "off" : "on");
      } catch {}
      return !v;
    });

  // Attach the source: plain file, native HLS (Safari), or hls.js from CDN.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    setError(false);
    let hls: any = null;
    let cancelled = false;

    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (isHls && !v.canPlayType("application/vnd.apple.mpegurl")) {
      loadHls()
        .then((Hls) => {
          if (cancelled) return;
          if (!Hls.isSupported()) return setError(true);
          hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(v);
          hls.on(Hls.Events.ERROR, (_e: unknown, data: { fatal?: boolean }) => {
            if (data.fatal) setError(true);
          });
        })
        .catch(() => !cancelled && setError(true));
    } else {
      v.src = src;
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      v.removeAttribute("src");
      v.load();
    };
  }, [src, reload]);

  // The ambient loop: copy the current frame onto the small canvas.
  useEffect(() => {
    const v = video.current;
    const c = canvas.current;
    if (!ambient || !v || !c) return;
    const ctx = c.getContext("2d", { alpha: false });
    if (!ctx) return;
    c.width = 64;
    c.height = 36;

    let raf = 0;
    let last = 0;
    let stopped = false;

    const draw = () => {
      if (v.readyState >= 2) {
        try {
          ctx.drawImage(v, 0, 0, c.width, c.height);
        } catch {
          // ignore a frame that can't be drawn
        }
      }
    };
    const loop = (now: number) => {
      if (stopped) return;
      if (!v.paused && !v.ended && now - last > 66) {
        last = now; // ~15 fps
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    v.addEventListener("loadeddata", draw);
    v.addEventListener("seeked", draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      v.removeEventListener("loadeddata", draw);
      v.removeEventListener("seeked", draw);
    };
  }, [ambient, src, reload]);

  return (
    <div className={className}>
      <div className="relative isolate">
        {ambient && (
          <canvas
            ref={canvas}
            aria-hidden
            className="pointer-events-none absolute -z-10 rounded-[2rem] opacity-80 blur-[36px] saturate-[1.8] sm:blur-[60px]"
            style={{ left: "-8%", top: "-8%", width: "116%", height: "116%" }}
          />
        )}

        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <video
            ref={video}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            autoPlay={autoPlay}
            onEnded={onEnded}
            onError={() => setError(true)}
            className="absolute inset-0 h-full w-full"
          />

          {error && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-black/75 p-4 text-center text-white">
              <div className="space-y-3">
                <p className="text-sm font-medium">This video didn&apos;t load.</p>
                <button
                  type="button"
                  onClick={() => setReload((n) => n + 1)}
                  className="min-h-[48px] rounded-full bg-teal-400 px-6 font-semibold text-black"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={ambient}
          className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${
            ambient ? "border-teal-400 bg-teal-400 text-black" : "border-neutral-600 bg-white/5"
          }`}
        >
          Ambient mode {ambient ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}