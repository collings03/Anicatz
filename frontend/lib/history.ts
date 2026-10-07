export type HistoryItem = {
  id: string | number;
  ep: number | string;
  title: string;
  image?: string | null;
  time: number; // seconds watched
  duration: number; // total seconds (0 if unknown)
  at: number; // timestamp, newest first
};

const KEY = "anicatz_history";
const MAX = 20;

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** One entry per anime: watching a new episode replaces the old one and moves it to the front. */
export function saveHistory(item: Omit<HistoryItem, "at">) {
  try {
    const rest = getHistory().filter((h) => String(h.id) !== String(item.id));
    rest.unshift({ ...item, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(rest.slice(0, MAX)));
    window.dispatchEvent(new Event("anicatz-history"));
  } catch {}
}

export function getProgress(id: string | number, ep: string | number): number {
  const h = getHistory().find((x) => String(x.id) === String(id) && String(x.ep) === String(ep));
  return h && h.duration && h.time < h.duration - 10 ? h.time : 0;
}

export function removeHistory(id: string | number) {
  try {
    localStorage.setItem(KEY, JSON.stringify(getHistory().filter((h) => String(h.id) !== String(id))));
    window.dispatchEvent(new Event("anicatz-history"));
  } catch {}
}