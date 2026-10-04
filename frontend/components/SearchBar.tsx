"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex gap-2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search anime"
        aria-label="Search anime"
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400"
      />
      <button className="rounded-md bg-teal-400 px-4 py-2 text-sm font-semibold text-black">Search</button>
    </form>
  );
}
