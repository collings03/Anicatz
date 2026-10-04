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
    <main className="w-full px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold">{cfg.title}</h1>
      <AnimeGrid items={data.media} />
      <Pagination basePath={`/browse/${category}`} page={n} hasNext={data.pageInfo.hasNextPage} />
    </main>
  );
}