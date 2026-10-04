import AnimeGrid from "@/components/AnimeGrid";
import Pagination from "@/components/Pagination";
import { getBrowse } from "@/lib/api";
import { FORMAT_OPTIONS, GENRES, SORT_OPTIONS, STATUS_OPTIONS } from "@/lib/categories";

export default async function FilterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const genre = GENRES.find((g) => g === sp.genre);
  const format = FORMAT_OPTIONS.find((o) => o.value === sp.format)?.value;
  const status = STATUS_OPTIONS.find((o) => o.value === sp.status)?.value;
  const sort = SORT_OPTIONS.find((o) => o.value === sp.sort)?.value ?? "popular";
  const page = Math.max(1, Number(sp.page) || 1);

  const data = await getBrowse({ sort, status, format, genre, page, per_page: 30 });

  const qs = new URLSearchParams();
  if (genre) qs.set("genre", genre);
  if (format) qs.set("format", format);
  if (status) qs.set("status", status);
  qs.set("sort", sort);

  const tags = [
    genre,
    FORMAT_OPTIONS.find((o) => o.value === format)?.label,
    STATUS_OPTIONS.find((o) => o.value === status)?.label,
    SORT_OPTIONS.find((o) => o.value === sort)?.label,
  ].filter(Boolean);

  return (
    <main className="w-full px-6 py-8">
      <h1 className="mb-2 text-3xl font-bold">Filtered results</h1>
      <p className="mb-6 text-sm text-neutral-400">{tags.join(" • ")}</p>
      <AnimeGrid items={data.media} />
      <Pagination basePath={`/filter?${qs}`} page={page} hasNext={data.pageInfo.hasNextPage} />
    </main>
  );
}