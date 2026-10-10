"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ZOKO_BASE =
  process.env.NEXT_PUBLIC_VIDEO_PROVIDER_BASE_URL ??
  "https://zokoanime.video";

const COSMIC_BASE =
  process.env.NEXT_PUBLIC_COSMIC_API_BASE_URL ??
  "https://cosmic-api-pi.vercel.app";

const AMBIENT_KEY = "anicatz-ambient";
const SLOW_MS = 12000;

type Language = "sub" | "dub";
type Server = "zoko" | "cosmic";

type Props = {
  malId: number;
  aniId: number;
  episode: number;
  totalEpisodes: number;

  /**
   * Set true when this anime has a dub.
   * Example:
   * hasDub={true}
   */
  hasDub?: boolean;

  onEpisodeChange: (ep: number) => void;

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

/* -------------------------------------------------- */
/* Icons */
/* -------------------------------------------------- */

const FullscreenIcon = ({
  exit,
}: {
  exit: boolean;
}) => (
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

/* -------------------------------------------------- */
/* Ambient color helpers */
/* -------------------------------------------------- */

type RGB = [number, number, number];

const clamp = (n: number) =>
  Math.max(0, Math.min(255, n));

const vivid = (c: RGB): RGB =>
  c.map(
    (v) => clamp((v - 128) * 1.3 + 138)
  ) as RGB;

const css = (c: RGB) =>
  `rgb(${Math.round(c[0])}, ${Math.round(
    c[1]
  )}, ${Math.round(c[2])})`;

const hexOf = (c: string) => {
  const h = c.replace("#", "");

  return /^[0-9a-f]{6}$/i.test(h)
    ? h
    : "35d5bf";
};

/* -------------------------------------------------- */
/* Component */
/* -------------------------------------------------- */

export default function AnimePlayer({
  malId,
  aniId,
  episode,
  totalEpisodes,
  hasDub = false,
  onEpisodeChange,
  color = "35d5bf",
}: Props) {
  const ref =
    useRef<HTMLIFrameElement>(null);

  const box =
    useRef<HTMLDivElement>(null);

  const wrap =
    useRef<HTMLDivElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const timerRef =
    useRef<number | null>(null);

  /* ------------------------------------------------ */
  /* Player state */
  /* ------------------------------------------------ */

  const [language, setLanguage] =
    useState<Language>("sub");

  const [server, setServer] =
    useState<Server>("zoko");

  const [failed, setFailed] =
    useState(false);

  const [loaded, setLoaded] =
    useState(false);

  const [slow, setSlow] =
    useState(false);

  const [reload, setReload] =
    useState(0);

  const [expanded, setExpanded] =
    useState(false);

  const [isFs, setIsFs] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(false);

  const [ambient, setAmbient] =
    useState(true);

  const [syncing, setSyncing] =
    useState(false);

  const [canSync, setCanSync] =
    useState(false);

  const hex = hexOf(color);

  /* ------------------------------------------------ */
  /* Detect mobile */
  /* ------------------------------------------------ */

  useEffect(() => {
    const check = () => {
      setIsMobile(
        window.matchMedia(
          "(max-width: 768px)"
        ).matches ||
          /Android|iPhone|iPad|iPod|Mobile/i.test(
            navigator.userAgent
          )
      );
    };

    check();

    window.addEventListener(
      "resize",
      check
    );

    return () => {
      window.removeEventListener(
        "resize",
        check
      );
    };
  }, []);

  /* ------------------------------------------------ */
  /* Ambient preference */
  /* ------------------------------------------------ */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          AMBIENT_KEY
        );

      if (saved) {
        setAmbient(saved === "on");
        return;
      }
    } catch {}

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      setAmbient(false);
    }
  }, []);

  /* ------------------------------------------------ */
  /* Video sync availability */
  /* ------------------------------------------------ */

  useEffect(() => {
    setCanSync(
      !!navigator.mediaDevices
        ?.getDisplayMedia &&
        /Chrome|Edg\//.test(
          navigator.userAgent
        ) &&
        !/Android|iPhone|iPad|iPod|Mobile/i.test(
          navigator.userAgent
        )
    );
  }, []);

  /* ------------------------------------------------ */
  /* Reset ambient colors */
  /* ------------------------------------------------ */

  const resetColors =
    useCallback(() => {
      const el = wrap.current;

      if (!el) return;

      [
        "top",
        "right",
        "bottom",
        "left",
        "avg",
      ].forEach((key) => {
        el.style.setProperty(
          `--amb-${key}`,
          `#${hex}`
        );
      });
    }, [hex]);

  /* ------------------------------------------------ */
  /* Stop sync */
  /* ------------------------------------------------ */

  const stopSync =
    useCallback(() => {
      if (timerRef.current) {
        window.clearInterval(
          timerRef.current
        );
      }

      timerRef.current = null;

      streamRef.current
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;

      setSyncing(false);

      resetColors();
    }, [resetColors]);

  /* ------------------------------------------------ */
  /* Cleanup */
  /* ------------------------------------------------ */

  useEffect(() => {
    return () => {
      stopSync();
    };
  }, [stopSync]);

  /* ------------------------------------------------ */
  /* Start video color sync */
  /* ------------------------------------------------ */

  const startSync = async () => {
    try {
      if (
        !navigator.mediaDevices
          ?.getDisplayMedia
      ) {
        return;
      }

      const stream =
        await navigator.mediaDevices.getDisplayMedia(
          {
            video: {
              frameRate: 10,
            },
            audio: false,
            preferCurrentTab: true,
            selfBrowserSurface: "include",
          } as unknown as DisplayMediaStreamOptions
        );

      streamRef.current = stream;

      stream
        .getVideoTracks()[0]
        ?.addEventListener(
          "ended",
          stopSync
        );

      const video =
        document.createElement("video");

      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      await video.play();

      const W = 32;
      const H = 18;

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = W;
      canvas.height = H;

      const ctx =
        canvas.getContext("2d", {
          willReadFrequently: true,
        });

      if (!ctx) {
        stopSync();
        return;
      }

      const current: Record<
        string,
        RGB
      > = {
        top: [0, 0, 0],
        right: [0, 0, 0],
        bottom: [0, 0, 0],
        left: [0, 0, 0],
      };

      let first = true;

      timerRef.current =
        window.setInterval(() => {
          const player = box.current;
          const root = wrap.current;

          if (
            !player ||
            !root ||
            !video.videoWidth ||
            document.hidden
          ) {
            return;
          }

          if (
            document.fullscreenElement ||
            player.classList.contains(
              "fixed"
            )
          ) {
            return;
          }

          const r =
            player.getBoundingClientRect();

          const k =
            video.videoWidth /
            window.innerWidth;

          const sx = Math.max(
            0,
            r.left * k
          );

          const sy = Math.max(
            0,
            r.top * k
          );

          const sw = Math.min(
            r.width * k,
            video.videoWidth - sx
          );

          const sh = Math.min(
            r.height * k,
            video.videoHeight - sy
          );

          if (
            sw < 16 ||
            sh < 16
          ) {
            return;
          }

          ctx.drawImage(
            video,
            sx,
            sy,
            sw,
            sh,
            0,
            0,
            W,
            H
          );

          const pixels =
            ctx.getImageData(
              0,
              0,
              W,
              H
            ).data;

          const edge = (
            test: (
              x: number,
              y: number
            ) => boolean
          ): RGB => {
            let r0 = 0;
            let g0 = 0;
            let b0 = 0;
            let n = 0;

            for (
              let y = 0;
              y < H;
              y++
            ) {
              for (
                let x = 0;
                x < W;
                x++
              ) {
                if (
                  !test(x, y)
                ) {
                  continue;
                }

                const i =
                  (y * W + x) * 4;

                r0 += pixels[i];
                g0 +=
                  pixels[i + 1];
                b0 +=
                  pixels[i + 2];

                n++;
              }
            }

            return n
              ? [
                  r0 / n,
                  g0 / n,
                  b0 / n,
                ]
              : [0, 0, 0];
          };

          const target: Record<
            string,
            RGB
          > = {
            top: edge(
              (_, y) => y < 3
            ),

            bottom: edge(
              (_, y) => y >= H - 3
            ),

            left: edge(
              (x) => x < 3
            ),

            right: edge(
              (x) => x >= W - 3
            ),
          };

          let ar = 0;
          let ag = 0;
          let ab = 0;

          for (const name of Object.keys(
            target
          )) {
            const currentColor =
              current[name];

            const targetColor =
              target[name];

            const factor = first
              ? 1
              : 0.3;

            currentColor[0] +=
              (targetColor[0] -
                currentColor[0]) *
              factor;

            currentColor[1] +=
              (targetColor[1] -
                currentColor[1]) *
              factor;

            currentColor[2] +=
              (targetColor[2] -
                currentColor[2]) *
              factor;

            const output =
              vivid(currentColor);

            root.style.setProperty(
              `--amb-${name}`,
              css(output)
            );

            ar += output[0];
            ag += output[1];
            ab += output[2];
          }

          root.style.setProperty(
            "--amb-avg",
            css([
              ar / 4,
              ag / 4,
              ab / 4,
            ])
          );

          first = false;
        }, 120);

      setSyncing(true);
    } catch {
      stopSync();
    }
  };

  /* ------------------------------------------------ */
  /* Ambient toggle */
  /* ------------------------------------------------ */

  const toggleAmbient = () => {
    setAmbient((value) => {
      try {
        localStorage.setItem(
          AMBIENT_KEY,
          value ? "off" : "on"
        );
      } catch {}

      if (value) {
        stopSync();
      }

      return !value;
    });
  };

  /* ------------------------------------------------ */
  /* Build player URL */
  /* ------------------------------------------------ */

  const src = useMemo(() => {
    /*
     * Server 2 = Cosmic
     */
    if (server === "cosmic") {
      return `${COSMIC_BASE}/embeds/${aniId}/${episode}`;
    }

    /*
     * Server 1 = ZokoAnime
     */
    return `${ZOKO_BASE}/stream/mal/${malId}/${episode}/${language}?color=${hex}`;
  }, [
    server,
    language,
    aniId,
    malId,
    episode,
    hex,
  ]);

  /* ------------------------------------------------ */
  /* Provider label */
  /* ------------------------------------------------ */

  const providerLabel =
    server === "zoko"
      ? "ZokoAnime"
      : "Cosmic";

  /* ------------------------------------------------ */
  /* Reset player */
  /* ------------------------------------------------ */

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setSlow(false);
  }, [src]);

  /* ------------------------------------------------ */
  /* Loading timeout */
  /* ------------------------------------------------ */

  useEffect(() => {
    setLoaded(false);
    setSlow(false);

    const timeout =
      window.setTimeout(() => {
        setSlow(true);
      }, SLOW_MS);

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [src, reload]);

  /* ------------------------------------------------ */
  /* Provider postMessage */
  /* ------------------------------------------------ */

  useEffect(() => {
    let providerOrigin: string;

    try {
      providerOrigin =
        new URL(
          server === "cosmic"
            ? COSMIC_BASE
            : ZOKO_BASE
        ).origin;
    } catch {
      return;
    }

    function onMessage(
      event: MessageEvent
    ) {
      if (
        event.origin !==
          providerOrigin ||
        event.source !==
          ref.current?.contentWindow
      ) {
        return;
      }

      let data = event.data;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      /*
       * Cosmic events.
       */
      if (
        server === "cosmic" &&
        data?.channel === "cosmic"
      ) {
        if (
          data.event === "complete" &&
          episode < totalEpisodes
        ) {
          onEpisodeChange(
            episode + 1
          );
        }

        if (
          data.event === "error"
        ) {
          setFailed(true);
        }

        return;
      }

      /*
       * Generic / Zoko events.
       */
      const type =
        data?.type ??
        data?.event;

      if (
        type === "complete" &&
        episode < totalEpisodes
      ) {
        onEpisodeChange(
          episode + 1
        );
      }

      if (
        type === "error"
      ) {
        setFailed(true);
      }
    }

    window.addEventListener(
      "message",
      onMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        onMessage
      );
    };
  }, [
    server,
    episode,
    totalEpisodes,
    onEpisodeChange,
  ]);

  /* ------------------------------------------------ */
  /* Fullscreen state */
  /* ------------------------------------------------ */

  useEffect(() => {
    const onFullscreenChange =
      () => {
        setIsFs(
          document.fullscreenElement ===
            box.current
        );
      };

    document.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
    };
  }, []);

  /* ------------------------------------------------ */
  /* Expanded fullscreen fallback */
  /* ------------------------------------------------ */

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const onKey = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        setExpanded(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKey
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        onKey
      );
    };
  }, [expanded]);

  /* ------------------------------------------------ */
  /* Fullscreen toggle */
  /* ------------------------------------------------ */

  const toggleFullscreen =
    useCallback(async () => {
      if (expanded) {
        setExpanded(false);
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const element =
        box.current as
          | (HTMLDivElement & {
              webkitRequestFullscreen?: () => void;
            })
          | null;

      try {
        if (
          element?.requestFullscreen
        ) {
          await element.requestFullscreen();

          if (isMobile) {
            try {
              await (
                screen.orientation as ScreenOrientation & {
                  lock?: (
                    orientation: string
                  ) => Promise<void>;
                }
              ).lock?.(
                "landscape"
              );
            } catch {}
          }

          return;
        }

        if (
          element?.webkitRequestFullscreen
        ) {
          element.webkitRequestFullscreen();
          return;
        }
      } catch {}

      setExpanded(true);
    }, [
      expanded,
      isMobile,
    ]);

  /* ------------------------------------------------ */
  /* Retry */
  /* ------------------------------------------------ */

  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setSlow(false);

    setReload(
      (value) => value + 1
    );
  };

  /* ------------------------------------------------ */
  /* Change language */
  /* ------------------------------------------------ */

  const changeLanguage = (
    next: Language
  ) => {
    setLanguage(next);
    setServer("zoko");
    setFailed(false);
    setLoaded(false);
    setReload(
      (value) => value + 1
    );
  };

  /* ------------------------------------------------ */
  /* Change server */
  /* ------------------------------------------------ */

  const changeServer = (
    next: Server
  ) => {
    setServer(next);
    setFailed(false);
    setLoaded(false);
    setSlow(false);
    setReload(
      (value) => value + 1
    );
  };

  /* ------------------------------------------------ */
  /* Derived state */
  /* ------------------------------------------------ */

  const inFullscreen =
    expanded || isFs;

  const showProblem =
    failed ||
    (!loaded && slow);

  /* ------------------------------------------------ */
  /* Button styles */
  /* ------------------------------------------------ */

  const btn =
    "flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-neutral-600 bg-white/5 px-3 font-semibold transition active:scale-[0.98] disabled:opacity-40";

  const action =
    "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border border-neutral-600 bg-white/5 px-2 py-1.5 text-[11px] font-semibold leading-tight transition active:scale-[0.98] md:min-h-[44px] md:flex-row md:gap-2 md:px-4 md:text-sm";

  const tabButton =
    "min-h-[44px] rounded-lg px-5 text-sm font-semibold transition";

  const serverButton =
    "min-h-[44px] rounded-xl px-4 text-sm font-semibold transition";

  return (
    <div className="w-full">
      {/* ------------------------------------------------ */}
      {/* Animation */}
      {/* ------------------------------------------------ */}

      <style>{`
        @keyframes ambient-breathe {
          0%, 100% {
            opacity: .4;
            transform: scale(1);
          }

          50% {
            opacity: .7;
            transform: scale(1.04);
          }
        }

        .ambient-pulse {
          animation:
            ambient-breathe
            8s ease-in-out infinite;
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .ambient-pulse {
            animation: none;
            opacity: .5;
          }
        }
      `}</style>

      {/* ------------------------------------------------ */}
      {/* Player wrapper */}
      {/* ------------------------------------------------ */}

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
        {/* ------------------------------------------------ */}
        {/* Ambient glow */}
        {/* ------------------------------------------------ */}

        {ambient &&
          !inFullscreen && (
            <div
              aria-hidden
              className={`pointer-events-none absolute -inset-2 -z-10 sm:-inset-5 ${
                syncing
                  ? "opacity-80"
                  : "ambient-pulse"
              }`}
            >
              <div
                className="absolute inset-x-6 -top-1 h-1/2 rounded-full blur-2xl sm:blur-3xl"
                style={{
                  background:
                    "var(--amb-top)",
                }}
              />

              <div
                className="absolute inset-x-6 -bottom-1 h-1/2 rounded-full blur-2xl sm:blur-3xl"
                style={{
                  background:
                    "var(--amb-bottom)",
                }}
              />

              <div
                className="absolute inset-y-6 -left-1 w-1/3 rounded-full blur-2xl sm:blur-3xl"
                style={{
                  background:
                    "var(--amb-left)",
                }}
              />

              <div
                className="absolute inset-y-6 -right-1 w-1/3 rounded-full blur-2xl sm:blur-3xl"
                style={{
                  background:
                    "var(--amb-right)",
                }}
              />
            </div>
          )}

        {/* ------------------------------------------------ */}
        {/* Video box */}
        {/* ------------------------------------------------ */}

        <div
          ref={box}
          className={
            expanded
              ? "fixed inset-0 z-[10001] h-[100dvh] w-screen overflow-hidden bg-black"
              : "relative aspect-video overflow-hidden rounded-xl bg-black transition-shadow duration-300"
          }
          style={
            ambient && !expanded
              ? {
                  boxShadow:
                    "0 0 0 2px var(--amb-avg), 0 0 28px -6px var(--amb-avg)",
                }
              : undefined
          }
        >
          {/* ------------------------------------------------ */}
          {/* Iframe */}
          {/* ------------------------------------------------ */}

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

          {/* ------------------------------------------------ */}
          {/* Current server label */}
          {/* ------------------------------------------------ */}

          {!expanded && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur">
              {providerLabel}
            </div>
          )}

          {/* ------------------------------------------------ */}
          {/* Loading spinner */}
          {/* ------------------------------------------------ */}

          {!loaded &&
            !showProblem && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
              </div>
            )}

          {/* ------------------------------------------------ */}
          {/* Expanded close button */}
          {/* ------------------------------------------------ */}

          {expanded && (
            <button
              type="button"
              onClick={() =>
                setExpanded(false)
              }
              aria-label="Exit full screen"
              className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20"
            >
              Close
            </button>
          )}

          {/* ------------------------------------------------ */}
          {/* Error overlay */}
          {/* ------------------------------------------------ */}

          {showProblem && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 p-4 text-center text-white">
              <div className="max-w-xs space-y-3">
                <p className="text-sm font-medium">
                  {failed
                    ? "This episode didn't load."
                    : "Taking longer than usual..."}
                </p>

                <button
                  type="button"
                  onClick={retry}
                  className="mx-auto flex min-h-[48px] items-center gap-2 rounded-full bg-teal-400 px-6 font-semibold text-black transition active:scale-[0.97]"
                >
                  <RetryIcon />
                  Retry
                </button>

                <p className="text-xs text-white/60">
                  Try another server if
                  this player is unavailable.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* Controls */}
      {/* ------------------------------------------------ */}

      <div className="mt-4 space-y-3 pb-24 text-sm md:pb-0">
        {/* ------------------------------------------------ */}
        {/* Episode navigation */}
        {/* ------------------------------------------------ */}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            disabled={episode <= 1}
            onClick={() =>
              onEpisodeChange(
                episode - 1
              )
            }
            className={btn}
          >
            <span aria-hidden>
              &lsaquo;
            </span>

            Previous
          </button>

          <span className="px-1 text-center text-sm font-semibold sm:px-3">
            Ep {episode}

            <span className="font-normal text-white/50">
              {" "}
              / {totalEpisodes}
            </span>
          </span>

          <button
            type="button"
            disabled={
              episode >=
              totalEpisodes
            }
            onClick={() =>
              onEpisodeChange(
                episode + 1
              )
            }
            className={btn}
          >
            Next

            <span aria-hidden>
              &rsaquo;
            </span>
          </button>
        </div>

        {/* ------------------------------------------------ */}
        {/* SUB / DUB */}
        {/* ------------------------------------------------ */}

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Language
          </div>

          <div className="inline-grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
            {/* SUB */}
            <button
              type="button"
              aria-pressed={
                language === "sub"
              }
              onClick={() =>
                changeLanguage("sub")
              }
              className={`${tabButton} ${
                language === "sub"
                  ? "bg-teal-400 text-black"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              SUB
            </button>

            {/* DUB */}
            {hasDub && (
              <button
                type="button"
                aria-pressed={
                  language === "dub"
                }
                onClick={() =>
                  changeLanguage("dub")
                }
                className={`${tabButton} ${
                  language === "dub"
                    ? "bg-teal-400 text-black"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                DUB
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* Servers */}
        {/* ------------------------------------------------ */}

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {language === "dub"
              ? "Dub servers"
              : "Sub servers"}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Server 1 */}
            <button
              type="button"
              aria-pressed={
                server === "zoko"
              }
              onClick={() =>
                changeServer("zoko")
              }
              className={`${serverButton} ${
                server === "zoko"
                  ? "bg-teal-400 text-black"
                  : "bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10"
              }`}
            >
              <span>
                Server 1
              </span>

              <span
                className={`ml-1 text-xs ${
                  server === "zoko"
                    ? "text-black/60"
                    : "text-white/40"
                }`}
              >
                Zoko
              </span>
            </button>

            {/* Server 2 */}
            <button
              type="button"
              aria-pressed={
                server === "cosmic"
              }
              onClick={() =>
                changeServer("cosmic")
              }
              className={`${serverButton} ${
                server === "cosmic"
                  ? "bg-teal-400 text-black"
                  : "bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10"
              }`}
            >
              <span>
                Server 2
              </span>

              <span
                className={`ml-1 text-xs ${
                  server === "cosmic"
                    ? "text-black/60"
                    : "text-white/40"
                }`}
              >
                Cosmic
              </span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* Mobile notice */}
        {/* ------------------------------------------------ */}

        {isMobile && (
          <p className="text-xs text-white/40">
            You can switch between
            Server 1 and Server 2 if
            a player is unavailable.
          </p>
        )}

        {/* ------------------------------------------------ */}
        {/* Player actions */}
        {/* ------------------------------------------------ */}

        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
          {/* Fullscreen */}
          <button
            type="button"
            onClick={
              toggleFullscreen
            }
            aria-label={
              inFullscreen
                ? "Exit full screen"
                : "Full screen"
            }
            className={action}
          >
            <FullscreenIcon
              exit={inFullscreen}
            />

            <span>
              {inFullscreen
                ? "Exit"
                : "Full screen"}
            </span>
          </button>

          {/* Retry */}
          <button
            type="button"
            onClick={retry}
            aria-label="Reload the player"
            className={action}
          >
            <RetryIcon />

            <span>
              Retry
            </span>
          </button>

          {/* Ambient */}
          <button
            type="button"
            onClick={
              toggleAmbient
            }
            aria-pressed={ambient}
            aria-label="Ambient mode"
            className={`${action} ${
              ambient
                ? "!border-teal-400 !bg-teal-400 !text-black"
                : ""
            }`}
          >
            <AmbientIcon />

            <span>
              Ambient{" "}
              {ambient
                ? "on"
                : "off"}
            </span>
          </button>

          {/* Sync */}
          {canSync &&
            ambient &&
            !isMobile && (
              <button
                type="button"
                onClick={
                  syncing
                    ? stopSync
                    : startSync
                }
                aria-pressed={
                  syncing
                }
                className={`${action} ${
                  syncing
                    ? "!border-teal-400 !bg-teal-400 !text-black"
                    : ""
                }`}
              >
                <SyncIcon />

                <span>
                  {syncing
                    ? "Stop sync"
                    : "Sync with video"}
                </span>
              </button>
            )}
        </div>

        {/* ------------------------------------------------ */}
        {/* Sync information */}
        {/* ------------------------------------------------ */}

        {syncing && (
          <p className="text-xs text-white/50">
            Sync is on: your browser
            shows a "sharing this tab"
            notice. Nothing is recorded
            or uploaded.
          </p>
        )}
      </div>
    </div>
  );
}