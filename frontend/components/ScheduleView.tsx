"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clientLang } from "@/lib/lang";
import { animeSlug, displayTitle, type ScheduleItem } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const API_ORIGIN = (() => {
  try {
    return new URL(API).origin;
  } catch {
    return "";
  }
})();
const VISIBLE = 7;
const GAP = 12; // px, matches gap-3
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Every day from the 1st of last month to the end of this month. */
function buildDays() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const days: Date[] = [];
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  const today = days.findIndex((d) => keyOf(d) === keyOf(now));
  return { days, today };
}

function gmtLabel(now: Date) {
  const off = -now.getTimezoneOffset();
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `GMT${off >= 0 ? "+" : "-"}${hh}:${mm}`;
}

/** Live clock in its own component so the ticking only re-renders this pill, not the whole schedule. */
function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  return (
    <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-black">
      ({gmtLabel(now)}) {now.toLocaleDateString("en-GB")} {now.toLocaleTimeString("en-US")}
    </span>
  );
}

export default function HomeSchedule() {
  const [days, setDays] = useState<Date[]>([]);
  const [todayIdx, setTodayIdx] = useState(0);
  const [selected, setSelected] = useState(0);
  const [cache, setCache] = useState<Record<string, ScheduleItem[]>>({});
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const { days, today } = buildDays();
    setDays(days);
    setTodayIdx(today);
    setSelected(today);
  }, []);

  /** Tabs visible at once (7 on desktop, 4 on small screens). */
  const perView = () => {
    const s = strip.current;
    return s ? Number(getComputedStyle(s).getPropertyValue("--n")) || 7 : 7;
  };

  /** Scroll so day `i` sits in the middle of the visible window. */
  const showDay = (i: number, smooth = false) => {
    const s = strip.current;
    if (!s) return;
    const n = perView();
    const start = Math.max(0, Math.min(i - Math.floor(n / 2), days.length - n));
    const tab = tabs.current[start];
    if (tab) s.scrollTo({ left: tab.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    if (days.length) showDay(todayIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, todayIdx]);

  useEffect(() => {
    if (!days.length) return;
    const d = days[selected];
    const k = keyOf(d);

    // FIX: clear any old error first, so switching to an already-loaded day
    // doesn't keep showing "Couldn't load this day".
    setError(false);
    if (cache[k]) return;

    const ctrl = new AbortController();
    const start = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000);
    const end = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() / 1000);
    fetch(`${API}/anime/schedule/?start=${start}&end=${end}&lang=${clientLang()}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: ScheduleItem[]) => setCache((c) => ({ ...c, [k]: data })))
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [days, selected, cache, retry]);

  const pick = (i: number) => {
    setSelected(i);
    setShowAll(false);
  };

  // One full page (7 days) per click.
  const page = (dir: number) => {
    const s = strip.current;
    if (s) s.scrollBy({ left: dir * (s.clientWidth + GAP), behavior: "smooth" });
  };

  const key = days.length ? keyOf(days[selected]) : "";
  const items = cache[key];
  const sorted = items ? [...items].sort((a, b) => a.airingAt - b.airingAt) : [];
  const shown = showAll ? sorted : sorted.slice(0, VISIBLE);
  const isToday = selected === todayIdx;

  return (
    <section className="rounded-xl bg-neutral-900/50 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-medium text-pink-300">Estimated Schedule</h2>
        <div className="flex items-center gap-2">
          {!isToday && days.length > 0 && (
            <button
              onClick={() => {
                pick(todayIdx);
                showDay(todayIdx, true);
              }}
              className="rounded-full bg-neutral-800 px-3.5 py-1.5 text-xs hover:bg-neutral-700"
            >
              Today
            </button>
          )}
          <Clock />
        </div>
      </div>

      {/* Day strip: exactly 7 dates visible */}
      <div className="relative mb-4">
        <button
          onClick={() => page(-1)}
          aria-label="Earlier days"
          className="absolute -left-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-base text-black shadow"
        >
          &lsaquo;
        </button>
        <div ref={strip} className="day-strip no-scrollbar relative flex snap-x snap-mandatory gap-3 overflow-x-auto" role="tablist">
          {days.map((d, i) => (
            <button
              key={i}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              aria-selected={selected === i}
              onClick={() => pick(i)}
              className={`day-tab snap-start rounded-xl px-2 py-3 text-center ${
                selected === i ? "bg-pink-300 text-black" : "bg-neutral-800 text-white hover:bg-neutral-700"
              }`}
            >
              <div className="text-base font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className={`text-xs font-normal ${selected === i ? "text-black/70" : "text-neutral-400"}`}>
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => page(1)}
          aria-label="Later days"
          className="absolute -right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-base text-black shadow"
        >
          &rsaquo;
        </button>
      </div>

      {/* Rows */}
      {error ? (
        <p className="text-sm text-neutral-400">
          Couldn&apos;t load this day.{" "}
          <button className="underline" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </p>
      ) : !items ? (
        <p className="text-sm text-neutral-400">Loading schedule...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing scheduled for this day.</p>
      ) : (
        <>
          <ul className="divide-y divide-neutral-800">
            {shown.map((s) => {
              // Aired + has a MAL id => open the episode in the player. Otherwise open the details page.
              const aired = s.airingAt * 1000 <= Date.now();
              const playable = aired && !!s.media.idMal;
              const href = playable
                ? `/watch/${animeSlug(s.media)}/${s.episode}`
                : `/anime/${animeSlug(s.media)}`;
              return (
                <li key={`${s.media.id}-${s.episode}`}>
                  <Link
                    href={href}
                    title={playable ? `Watch episode ${s.episode}` : aired ? "Open details" : "Not aired yet - open details"}
                    className="group flex items-center gap-4 px-2 py-3 hover:bg-neutral-800/60"
                  >
                    <span className="w-12 shrink-0 text-base font-normal tabular-nums text-neutral-500">
                      {new Date(s.airingAt * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-base font-normal group-hover:text-pink-300 ${
                        aired ? "text-white" : "text-white/60"
                      }`}
                    >
                      {displayTitle(s.media)}
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-2 text-xs font-normal ${
                        playable ? "text-pink-300" : "text-neutral-400"
                      }`}
                    >
                      <span className="text-[9px]">{playable ? "\u25B6" : "\u25F7"}</span>
                      Episode {s.episode}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {sorted.length > VISIBLE && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-4 px-2 text-sm font-normal hover:text-pink-300">
              {showAll ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}