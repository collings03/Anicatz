"use client";
// Save as: frontend/lib/watchlist.ts
// The watchlist is saved in the browser (localStorage), so it works instantly for everyone, logged in or not.
import { useCallback, useEffect, useState } from "react";

export type SavedAnime = { id: number; slug: string; title: string; cover: string; format?: string | null };

const KEY = "anicatz-watchlist";
const EVENT = "anicatz-watchlist";
const MAX = 500;

function read(): SavedAnime[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list: SavedAnime[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
  window.dispatchEvent(new Event(EVENT)); // tells every button and the watchlist page to refresh
}

export function useWatchlist() {
  const [list, setList] = useState<SavedAnime[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setList(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // another tab changed it
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const has = useCallback((id: number) => list.some((a) => a.id === id), [list]);

  const toggle = useCallback((a: SavedAnime) => {
    const cur = read();
    write(cur.some((x) => x.id === a.id) ? cur.filter((x) => x.id !== a.id) : [a, ...cur]);
  }, []);

  const remove = useCallback((id: number) => write(read().filter((x) => x.id !== id)), []);
  const clear = useCallback(() => write([]), []);

  return { list, ready, has, toggle, remove, clear };
}