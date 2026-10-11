"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clientLang } from "@/lib/lang";
import { animeSlug, displayTitle, type ScheduleItem } from "@/lib/types";
import ErrorScreen, { isNetworkError } from "@/components/ErrorScreen";
import { API } from "@/lib/auth";

// The schedule endpoint on your backend. The address comes from NEXT_PUBLIC_API_URL (see lib/auth.ts),
// so moving the backend only means changing that one setting.
const SCHEDULE_URL = `${API}/anime/schedule/`;
const SCHEDULE_ORIGIN = (() => {
  try {
    return new URL(SCHEDULE_URL).origin;
  } catch {
    return "";
  }
})();
const VISIBLE = 7;
const GAP = 12; // px, matches gap-3
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/* ---------- Fast loading: shared cache + saved copy + prefetch ---------- */

type Entry = { t: number; data: ScheduleItem[] };
const FRESH_MS = 5 * 60 * 1000; // newer than this: no request at all
const STALE_MS = 6 * 60 * 60 * 1000; // newer than this: show it instantly, refresh in the background
const PREFIX = "anicatz:sched:";

const memory = new Map<string, Entry>(); // lives as long as the tab
const inflight = new Map<string, Promise<ScheduleItem[]>>(); // one request per day, even if asked twice

const idOf = (lang: string, d: Date) => `${lang}:${keyOf(d)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Day from memory, or from the copy saved in the browser (so a page reload is instant). */
function readEntry(id: string): Entry | undefined {
  const m = memory.get(id);
  if (m) return m;
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (!raw) return undefined;
    const e = JSON.parse(raw) as Entry;
    if (!e?.t || !Array.isArray(e.data) || Date.now() - e.t > STALE_MS) {
      localStorage.removeItem(PREFIX + id);
      return undefined;
    }
    memory.set(id, e);
    return e;
  } catch {
    return undefined;
  }
}

function writeEntry(id: string, data: ScheduleItem[]) {
  const e: Entry = { t: Date.now(), data };
  memory.set(id, e);
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(e));
  } catch {
    // Storage full: drop the saved schedule copies and carry on with memory only.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  }
}

/**
 * GET with one automatic retry for cold starts (5xx) and dropped connections.
 * The wait is longer than before (2.5s) so a backend that is rate-limited by AniList
 * gets a little room instead of being hit again right away.
 */
async function fetchJson(url: string, attempt = 0): Promise<ScheduleItem[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      if (attempt < 1 && r.status >= 500) {
        await sleep(2500);
        return fetchJson(url, 1);
      }
      throw new Error(`HTTP ${r.status}`);
    }
    return (await r.json()) as ScheduleItem[];
  } catch (e) {
    if (attempt < 1 && e instanceof TypeError) {
      await sleep(2500);
      return fetchJson(url, 1);
    }
    throw e;
  }
}

function loadDay(d: Date, lang: string): Promise<ScheduleItem[]> {
  const id = idOf(lang, d);
  const running = inflight.get(id);
  if (running) return running;

  const start = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000);
  const end = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() / 1000);
  const url = `${SCHEDULE_URL}?start=${start}&end=${end}&lang=${lang}`;

  const p = fetchJson(url)
    .then((data) => {
      writeEntry(id, data);
      return data;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

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
    // Fixed colours (not text-white / bg-white) so the pill stays readable in light mode too.
    <span className="rounded-full bg-[#f4f4f8] px-3 py-1.5 text-[11px] font-medium text-[#08080d] ring-1 ring-black/10 sm:px-3.5 sm:text-xs">
      ({gmtLabel(now)}) {now.toLocaleDateString("en-GB")} {now.toLocaleTimeString("en-US")}
    </span>
  );
}

/** Placeholder rows shown while a day loads: feels faster than the words "Loading schedule...". */
function ScheduleSkeleton() {
  return (
    <ul className="divide-y divide-neutral-800" aria-busy="true" aria-label="Loading schedule">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-1 py-3 sm:gap-4 sm:px-2">
          <span className="h-4 w-11 shrink-0 animate-pulse rounded bg-neutral-800 sm:w-12" />
          <span className="h-4 flex-1 animate-pulse rounded bg-neutral-800" style={{ maxWidth: `${55 + ((i * 13) % 35)}%` }} />
          <span className="h-4 w-10 shrink-0 animate-pulse rounded bg-neutral-800" />
        </li>
      ))}
    </ul>
  );
}

export default function HomeSchedule() {
  const [days, setDays] = useState<Date[]>([]);
  const [todayIdx, setTodayIdx] = useState(0);
  const [selected, setSelected] = useState(0);
  const [, setTick] = useState(0); // re-render when a day finishes loading into the shared cache
  const [error, setError] = useState<string | null>(null);
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

  // Load the selected day. Saved or in-memory copies show instantly; the network is only used when needed.
  useEffect(() => {
    if (!days.length) return;
    const lang = clientLang();
    const d = days[selected];
    let alive = true;
    const timers: number[] = [];
    const cleanup = () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
    };

    // Warm only the NEXT day, a couple of seconds later, so the backend (and AniList's rate limit)
    // is not hit with several requests at once. The previous day loads when someone clicks it.
    const prefetch = () => {
      const n = days[selected + 1];
      if (!n || readEntry(idOf(lang, n))) return;
      timers.push(
        window.setTimeout(() => {
          loadDay(n, lang).catch(() => {});
        }, 2000),
      );
    };

    setError(null);
    const hit = readEntry(idOf(lang, d));
    if (hit && Date.now() - hit.t < FRESH_MS) {
      prefetch();
      return cleanup;
    }

    loadDay(d, lang)
      .then(() => {
        if (!alive) return;
        setTick((n) => n + 1);
        prefetch();
      })
      .catch((e) => {
        if (!alive || hit) return; // an older copy is already on screen: keep it, stay quiet
        console.error("Schedule request failed:", SCHEDULE_URL, e);
        // Shows the real reason on screen (e.g. "HTTP 502" or "Failed to fetch") so it can be fixed fast.
        setError(`${e.message || "Network error"} - ${SCHEDULE_URL}`);
      });
    return cleanup;
  }, [days, selected, retry]);

  const pick = (i: number) => {
    setSelected(i);
    setShowAll(false);
  };

  // One full page (7 days) per click.
  const page = (dir: number) => {
    const s = strip.current;
    if (s) s.scrollBy({ left: dir * (s.clientWidth + GAP), behavior: "smooth" });
  };

  // days.length > 0 only after mount, so this never runs on the server.
  const items = days.length ? readEntry(idOf(clientLang(), days[selected]))?.data : undefined;
  const sorted = items ? [...items].sort((a, b) => a.airingAt - b.airingAt) : [];
  const shown = showAll ? sorted : sorted.slice(0, VISIBLE);
  const isToday = selected === todayIdx;

  return (
    <section className="min-w-0 rounded-xl bg-neutral-900/50 p-3 sm:p-5">
      {/* Open the connection to the API early so the first request doesn't wait on DNS/TLS. */}
      {SCHEDULE_ORIGIN && <link rel="preconnect" href={SCHEDULE_ORIGIN} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3">
        <h2 className="text-lg font-medium text-pink-300 sm:text-xl">Estimated Schedule</h2>
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

      {/* Day strip: exactly 7 dates visible (4 on phones) */}
      <div className="relative mb-4">
        <button
          onClick={() => page(-1)}
          aria-label="Earlier days"
          className="absolute -left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-[#f4f4f8] text-base text-[#08080d] shadow ring-1 ring-black/10 sm:-left-3"
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
              className={`day-tab snap-start rounded-xl px-1 py-2.5 text-center sm:px-2 sm:py-3 ${
                selected === i ? "bg-pink-300 text-black" : "bg-neutral-800 text-white hover:bg-neutral-700"
              }`}
            >
              <div className="text-sm font-medium sm:text-base">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className={`text-[11px] font-normal sm:text-xs ${selected === i ? "text-black/70" : "text-neutral-400"}`}>
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => page(1)}
          aria-label="Later days"
          className="absolute -right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-[#f4f4f8] text-base text-[#08080d] shadow ring-1 ring-black/10 sm:-right-3"
        >
          &rsaquo;
        </button>
      </div>

      {/* Rows */}
      {error && !items ? (
        <ErrorScreen
          fullScreen={false}
          variant={isNetworkError(error) ? "network" : "server"}
          detail={error}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : !items ? (
        <ScheduleSkeleton />
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
                  {/* prefetch={false}: do not load every row's page in the background.
                      Each prefetch asks the backend (and AniList) for that anime, which caused bursts of 503s. */}
                  <Link
                    href={href}
                    prefetch={false}
                    title={playable ? `Watch episode ${s.episode}` : aired ? "Open details" : "Not aired yet - open details"}
                    className="group flex items-center gap-3 px-1 py-3 hover:bg-neutral-800/60 sm:gap-4 sm:px-2"
                  >
                    <span className="w-11 shrink-0 text-sm font-normal tabular-nums text-neutral-500 sm:w-12 sm:text-base">
                      {new Date(s.airingAt * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm font-normal group-hover:text-pink-300 sm:text-base ${
                        aired ? "text-white" : "text-white/60"
                      }`}
                    >
                      {displayTitle(s.media)}
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-1.5 text-[11px] font-normal sm:gap-2 sm:text-xs ${
                        playable ? "text-pink-300" : "text-neutral-400"
                      }`}
                    >
                      <span className="text-[9px]">{playable ? "\u25B6" : "\u25F7"}</span>
                      Ep {s.episode}
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