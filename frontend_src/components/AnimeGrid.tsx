import AnimeCard from "./AnimeCard";
import type { Anime } from "@/lib/types";

export default function AnimeGrid({ items }: { items: Anime[] }) {
  if (!items.length) return <p className="text-neutral-400">No results.</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((a) => (
        <AnimeCard key={a.id} anime={a} />
      ))}
    </div>
  );
}
