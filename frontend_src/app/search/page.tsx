import AnimeGrid from "@/components/AnimeGrid";
import SearchBar from "@/components/SearchBar";
import { searchAnime } from "@/lib/api";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = q ? await searchAnime(q) : null;
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <SearchBar initial={q} />
      {results ? (
        <>
          <h1 className="text-xl font-semibold">Results for &ldquo;{q}&rdquo;</h1>
          <AnimeGrid items={results.media} />
        </>
      ) : (
        <p className="text-neutral-400">Type a title to search.</p>
      )}
    </main>
  );
}
