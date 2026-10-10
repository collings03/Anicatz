"use client";

import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

export type ErrorVariant = "network" | "server" | "error" | "notfound";

/** True when the error looks like a lost connection rather than a bug or a server fault. */
export function isNetworkError(error?: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|networkerror|network request failed|load failed|err_internet|err_network|err_connection/i.test(
    msg,
  );
}

const COPY: Record<ErrorVariant, { title: string; message: string }> = {
  network: {
    title: "No internet connection",
    message:
      "Check your Wi-Fi or mobile data, then try again. AniCatz reconnects on its own once you're back online.",
  },
  server: {
    title: "The server isn't answering",
    message: "Your connection is fine, but the AniCatz data service is busy or down. Wait a moment, then try again.",
  },
  error: {
    title: "This page hit a problem",
    message: "Try loading it again. If it keeps happening, go back home and open the page from there.",
  },
  notfound: {
    title: "Page not found",
    message: "The link is wrong or the page was removed. Head home to keep browsing anime.",
  },
};

const INK = "#1b1530";
const FUR = "#cfc6f2";
const ACCENT = "#ff5d8f";

function CatArt({ variant }: { variant: ErrorVariant }) {
  return (
    <svg viewBox="0 0 160 124" className="h-32 w-auto" role="img" aria-hidden="true">
      <path d="M38 54 L45 12 L74 36 Z" fill={FUR} />
      <path d="M122 54 L115 12 L86 36 Z" fill={FUR} />
      <path d="M47 44 L50 24 L63 36 Z" fill={ACCENT} opacity=".55" />
      <path d="M113 44 L110 24 L97 36 Z" fill={ACCENT} opacity=".55" />
      <ellipse cx="80" cy="66" rx="47" ry="37" fill={FUR} />

      {variant === "error" ? (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d="M55 56 L67 68 M67 56 L55 68" />
          <path d="M93 56 L105 68 M105 56 L93 68" />
        </g>
      ) : variant === "network" ? (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M54 63 Q61 71 68 63" />
          <path d="M92 63 Q99 71 106 63" />
        </g>
      ) : (
        <g fill={INK}>
          <ellipse cx="61" cy="62" rx="5.5" ry="7.5" />
          <ellipse cx="99" cy="62" rx="5.5" ry="7.5" />
          <circle cx="63" cy="59" r="2" fill="#fff" />
          <circle cx="101" cy="59" r="2" fill="#fff" />
        </g>
      )}

      <path d="M75 76 H85 L80 82 Z" fill={ACCENT} />
      <path d="M80 82 Q74 90 68 87 M80 82 Q86 90 92 87" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {variant === "network" && (
        <g strokeLinecap="round">
          <path d="M6 112 H50" stroke={FUR} strokeWidth="5" />
          <rect x="50" y="105" width="16" height="14" rx="3" fill={FUR} />
          <rect x="94" y="105" width="16" height="14" rx="3" fill={FUR} />
          <path d="M110 112 H154" stroke={FUR} strokeWidth="5" />
          <path d="M74 102 L80 110 L74 118 M86 102 L80 110 L86 118" stroke={ACCENT} strokeWidth="3" fill="none" />
        </g>
      )}
    </svg>
  );
}

type Props = {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  /** Small technical line, e.g. an error reference or "HTTP 502". */
  detail?: string;
  onRetry?: () => void;
  /** Fill the whole viewport (pages, offline overlay). Use false inside a section. */
  fullScreen?: boolean;
};

export default function ErrorScreen({
  variant = "error",
  title,
  message,
  detail,
  onRetry,
  fullScreen = true,
}: Props) {
  const copy = COPY[variant];
  const retry = onRetry ?? (() => window.location.reload());

  return (
    <div
      role={variant === "network" ? "alert" : "status"}
      className={`flex w-full flex-col items-center justify-center px-6 text-center ${
        fullScreen ? "min-h-screen bg-[#14111f]" : "py-16"
      }`}
    >
      <CatArt variant={variant} />
      <h1 className="mt-6 text-2xl font-semibold text-[#f2eefc] sm:text-3xl">{title ?? copy.title}</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-[#a59fc0]">{message ?? copy.message}</p>
      {detail && <p className="mt-3 max-w-md break-all text-xs text-[#6f6890]">{detail}</p>}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {variant !== "notfound" && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-lg bg-[#ff5d8f] px-5 py-2.5 text-sm font-semibold text-[#14111f] transition hover:bg-[#ff7aa3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5d8f]"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        )}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-[#3a3359] px-5 py-2.5 text-sm font-semibold text-[#f2eefc] transition hover:bg-[#241f3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5d8f]"
        >
          <Home size={16} aria-hidden="true" />
          Go home
        </Link>
      </div>
    </div>
  );
}