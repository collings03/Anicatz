"use client";
// frontend/components/AmbientVideo.tsx
//
// YouTube-style ambient mode. The current video frame is drawn ~15 times a second onto a tiny
// canvas (64x36), which is stretched behind the player and heavily blurred. That is exactly how
// YouTube does it, so the glow follows the real picture frame by frame.
//
// It needs a real <video> element: an mp4 URL or an HLS (.m3u8) URL. It cannot work with an
// <iframe> player from another site, because the browser never lets your page see inside it.
import { useEffect, useRef, useState } from "react";
import type HlsType from "hls.js";

const KEY = "anicatz-ambient";

type Props = {
  /** Direct video address: .mp4 or .m3u8 (HLS). */
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
};

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

  // Attach the source: plain file, or HLS through hls.js (Safari plays HLS natively).
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    setError(false);
    let hls: HlsType | null = null;
    let cancelled = false;

    if (/\.m3u8(\?|$)/i.test(src) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) return setError(true);
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError(true);
        });
      });
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
    c.width = 64; // tiny on purpose: the CSS blur does the rest, and it keeps this very cheap
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
        last = now; // about 15 frames per second
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