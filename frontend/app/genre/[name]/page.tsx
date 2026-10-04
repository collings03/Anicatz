import { notFound } from "next/navigation";
import AnimeGrid from "@/components/AnimeGrid";
import Pagination from "@/components/Pagination";
import { getBrowse } from "@/lib/api";
import { GENRES } from "@/lib/categories";

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { name } = await params;
  const { page } = await searchParams;
  const decoded = decodeURIComponent(name);
  const genre = GENRES.find((g) => g.toLowerCase() === decoded.toLowerCase());
  if (!genre) notFound();

  const n = Math.max(1, Number(page) || 1);
  const data = await getBrowse({ sort: "popular", genre, page: n, per_page: 30 });

  return (
    <main className="w-full px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold">{genre} anime</h1>
      <AnimeGrid items={data.media} />
      <Pagination basePath={`/genre/${encodeURIComponent(genre)}`} page={n} hasNext={data.pageInfo.hasNextPage} />
    </main>
  );
}