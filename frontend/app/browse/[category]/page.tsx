import { notFound } from "next/navigation";
import AnimeGrid from "@/components/AnimeGrid";
import Pagination from "@/components/Pagination";
import { getBrowse } from "@/lib/api";
import type { AnimePage } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category } = await params;
  const { page } = await searchParams;
  const cfg = CATEGORIES[category];
  if (!cfg) notFound();

  const n = Math.max(1, Number(page) || 1);

  // If the backend is busy (for example AniList is rate-limiting it), show a retry message
  // instead of crashing the whole page with an error screen.
  let data: AnimePage | null = null;
  try {
    data = await getBrowse({ ...cfg.params, page: n, per_page: 30 });
  } catch (error) {
    console.error("Browse failed:", category, error);
  }

  return (
    // Phones: pt-14 clears the pinned logo, pb-32 clears the bottom navbar.
    // Desktop: the layout already clears the top navbar, so only a small pt-4 is needed.
    <main className="w-full px-3 pb-32 pt-14 sm:px-6 md:pb-12 md:pt-4">
      {/* Title on the left, category switcher (Top Airing, Most Popular, ...) on the right */}
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="min-w-0 truncate text-2xl font-bold sm:text-3xl">{cfg.title}</h1>
      </div>

      {data ? (
        <>
          <AnimeGrid items={data.media} />
          <Pagination basePath={`/browse/${category}`} page={n} hasNext={data.pageInfo.hasNextPage} />
        </>
      ) : (
        <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="font-semibold">This list could not be loaded right now.</p>
          <p className="mt-2 text-sm text-white/50">
            The server is busy. Wait a few seconds and try again.
          </p>
          {/* A plain link (not next/link) so the browser asks the server again instead of reusing the failed page. */}
          <a
            href={`/browse/${category}${n > 1 ? `?page=${n}` : ""}`}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-teal-400 px-6 font-semibold text-black transition active:scale-[0.97]"
          >
            Try again
          </a>
        </div>
      )}
    </main>
  );
}