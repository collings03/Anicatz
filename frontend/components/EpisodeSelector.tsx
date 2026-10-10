"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const RANGE_SIZE = 100; // each dropdown option covers this many episodes (1-100, 101-200, ...)
const DROPDOWN_AFTER = 100; // above this many episodes, show the range dropdown
const SCROLL_AFTER = 40; // above this many buttons in view, the grid scrolls instead of growing

const rangeLabel = (i: number, total: number) => {
  const a = i * RANGE_SIZE + 1;
  const b = Math.min(total, (i + 1) * RANGE_SIZE);
  return { a, b, text: `${a} - ${b}`, count: b - a + 1 };
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/** Themed range picker: replaces the native <select>, which can't be styled. */
function RangeMenu({
  value,
  count,
  total,
  onChange,
}: {
  value: number;
  count: number;
  total: number;
  onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(value);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // Close when tapping or clicking outside.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  useEffect(() => {
    if (open) setHi(value);
  }, [open, value]);

  // Keep the highlighted option visible inside the list (moves the list only, never the page).
  useEffect(() => {
    const ul = list.current;
    const el = ul?.children[hi] as HTMLElement | undefined;
    if (!open || !ul || !el) return;
    ul.scrollTop = el.offsetTop - ul.clientHeight / 2 + el.clientHeight / 2;
  }, [open, hi]);

  const choose = (i: number) => {
    onChange(i);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setHi((h) => Math.max(0, Math.min(count - 1, h + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setHi(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setHi(count - 1);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(hi);
    }
  };

  const current = rangeLabel(value, total);

  return (
    <div ref={wrap} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Episode range, ${current.text}`}
        className={`glass flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sm:min-h-10 sm:min-w-[11rem] ${
          open ? "ring-2 ring-teal-400" : "hover:bg-white/10"
        }`}
      >
        <span className="flex items-baseline gap-2">
          <span className="text-xs text-white/50">Range</span>
          <span className="font-semibold tabular-nums text-white">{current.text}</span>
        </span>
        <span className="text-teal-400">
          <Chevron open={open} />
        </span>
      </button>

      <ul
        ref={list}
        role="listbox"
        aria-hidden={!open}
        className={`absolute left-0 right-0 z-30 mt-2 max-h-64 origin-top overflow-y-auto overscroll-contain rounded-2xl bg-[color:var(--card-bg,#171717)] p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10 backdrop-blur-xl transition duration-150 sm:right-auto sm:w-64 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {Array.from({ length: count }, (_, i) => {
          const r = rangeLabel(i, total);
          const selected = i === value;
          return (
            <li
              key={i}
              role="option"
              aria-selected={selected}
              onClick={() => choose(i)}
              onMouseEnter={() => setHi(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm transition-colors sm:min-h-10 ${
                selected
                  ? "bg-teal-400 font-semibold text-black"
                  : i === hi
                    ? "bg-white/10 text-white"
                    : "text-white/80"
              }`}
            >
              <span className="tabular-nums">{r.text}</span>
              <span className={`flex items-center gap-2 text-xs ${selected ? "text-black/70" : "text-white/40"}`}>
                {r.count} eps
                {selected && <Check />}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Props = {
  /** Number of episodes to list. For ongoing shows use the latest aired episode. */
  total: number;
  /** Each button links to `${basePath}/${episode}`, e.g. "/watch/one-piece-21". */
  basePath: string;
  /** Episode currently being watched (highlighted). */
  current?: number;
  /** Tailwind classes for the chip columns. Use fewer columns inside a narrow sidebar. */
  gridClassName?: string;
  /** Tailwind classes that cap the height of the scroll box. */
  scrollClassName?: string;
};

export default function EpisodeSelector({
  total,
  basePath,
  current,
  gridClassName = "grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12",
  scrollClassName = "max-h-56 sm:max-h-64",
}: Props) {
  const rangeCount = Math.max(1, Math.ceil(total / RANGE_SIZE));
  const useDropdown = total > DROPDOWN_AFTER;

  const rangeOf = (ep?: number) => (ep && ep > 0 ? Math.min(rangeCount - 1, Math.floor((ep - 1) / RANGE_SIZE)) : 0);
  const [range, setRange] = useState(rangeOf(current));
  const box = useRef<HTMLDivElement>(null);
  const currentChip = useRef<HTMLAnchorElement>(null);

  // Follow the episode being watched (e.g. after clicking "next episode").
  useEffect(() => {
    setRange(rangeOf(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total]);

  // Scroll the highlighted episode into view inside the box only (never scrolls the page itself).
  useEffect(() => {
    const b = box.current;
    const c = currentChip.current;
    if (!b || !c) return;
    b.scrollTop = c.offsetTop - b.clientHeight / 2 + c.clientHeight / 2;
  }, [current, range]);

  if (!total || total < 1) return null;

  const from = useDropdown ? range * RANGE_SIZE + 1 : 1;
  const to = useDropdown ? Math.min(total, (range + 1) * RANGE_SIZE) : total;
  const episodes = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const scrolls = episodes.length > SCROLL_AFTER;

  return (
    <div className="min-w-0">
      {useDropdown && (
        <div className="mb-3">
          <RangeMenu value={range} count={rangeCount} total={total} onChange={setRange} />
        </div>
      )}

      {/* Fixed columns so chips fill the width evenly: 5 on phones, more as the screen grows. */}
      <div
        ref={box}
        className={`relative grid gap-2 ${gridClassName} ${
          scrolls ? `${scrollClassName} overflow-y-auto overscroll-contain pr-1` : ""
        }`}
      >
        {episodes.map((ep) => {
          const active = ep === current;
          return (
            <Link
              key={ep}
              ref={active ? currentChip : undefined}
              href={`${basePath}/${ep}`}
              aria-current={active ? "page" : undefined}
              className={`grid h-11 place-items-center rounded-xl text-sm tabular-nums ring-1 transition active:scale-95 sm:h-10 sm:hover:-translate-y-0.5 ${
                active
                  ? "bg-teal-400 font-semibold text-black ring-teal-400"
                  : "bg-white/5 text-white/80 ring-white/10 hover:bg-teal-400 hover:text-black hover:ring-teal-400"
              }`}
            >
              {ep}
            </Link>
          );
        })}
      </div>
    </div>
  );
}