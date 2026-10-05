import { notFound } from "next/navigation";
import AnimeGrid from "@/components/AnimeGrid";
import Pagination from "@/components/Pagination";
import { getBrowse } from "@/lib/api";
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
  const data = await getBrowse({ ...cfg.params, page: n, per_page: 30 });

  return (
    // Phones: pt-14 clears the pinned logo, pb-32 clears the bottom navbar.
    // Desktop: the layout already clears the top navbar, so only a small pt-4 is needed.
    <main className="w-full px-3 pb-32 pt-14 sm:px-6 md:pb-12 md:pt-4">
      {/* Title on the left, category switcher (Top Airing, Most Popular, ...) on the right */}
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="min-w-0 truncate text-2xl font-bold sm:text-3xl">{cfg.title}</h1>
        
      </div>

      <AnimeGrid items={data.media} />
      <Pagination basePath={`/browse/${category}`} page={n} hasNext={data.pageInfo.hasNextPage} />
    </main>
  );
}