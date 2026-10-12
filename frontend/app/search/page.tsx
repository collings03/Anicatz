// frontend/app/search/page.tsx
// Assumes lib/api.ts exports getSearch({ q, page, per_page }) returning AnimePage,
// the same way getBrowse does. If your function has a different name, change the import.
import AnimeGrid from "@/components/AnimeGrid";
import Pagination from "@/components/Pagination";
import { getBrowse } from "@/lib/api";
import type { AnimePage } from "@/lib/types";

// The API module does not export a dedicated search helper. Reuse its browse
// request with the query parameter accepted by the search page.
const getSearch = getBrowse as unknown as (params: {
  q: string;
  page: number;
  per_page: number;
}) => Promise<AnimePage>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page } = await searchParams;
  const query = q.trim();
  const n = Math.max(1, Math.floor(Number(page)) || 1);

  let data: AnimePage | null = null;
  let failed = false;

  if (query) {
    try {
      const res = await getSearch({ q: query, page: n, per_page: 30 });
      // If the backend returns an error object or an unexpected shape, treat it as a failure.
      if (!Array.isArray(res?.media) || !res?.pageInfo) {
        throw new Error("Unexpected response: " + JSON.stringify(res)?.slice(0, 200));
      }
      data = res;
    } catch (error) {
      console.error("Search failed:", query, error);
      failed = true;
    }
  }

  const retryHref = `/search?q=${encodeURIComponent(query)}${n > 1 ? `&page=${n}` : ""}`;

  return (
    <main className="w-full px-3 pb-32 pt-14 sm:px-6 md:pb-12 md:pt-4">
      <h1 className="mb-4 truncate text-2xl font-bold sm:mb-6 sm:text-3xl">
        {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
      </h1>

      {!query && <p className="text-white/50">Type something in the search bar to find an anime.</p>}

      {failed && (
        <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="font-semibold">Search could not be loaded right now.</p>
          <p className="mt-2 text-sm text-white/50">
            The server may be waking up or busy. Wait a few seconds and try again.
          </p>
          {/* Plain link so the browser asks the server again instead of reusing the failed page. */}
          <a
            href={retryHref}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-teal-400 px-6 font-semibold text-black transition active:scale-[0.97]"
          >
            Try again
          </a>
        </div>
      )}

      {data && data.media.length === 0 && (
        <p className="text-white/50">No results found for &ldquo;{query}&rdquo;.</p>
      )}

      {data && data.media.length > 0 && (
        <>
          <AnimeGrid items={data.media} />
          {/* If your Pagination component appends "?page=N" itself, it will clash with the existing "?q=".
              In that case change it to join with "&" when basePath already contains "?". */}
          <Pagination
            basePath={`/search?q=${encodeURIComponent(query)}`}
            page={n}
            hasNext={data.pageInfo.hasNextPage}
          />
        </>
      )}
    </main>
  );
}