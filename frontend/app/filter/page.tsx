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
  ].filter(Boolean) as string[];

  return (
    // Phones: pt-14 clears the pinned logo, pb-32 clears the bottom navbar.
    // Desktop: the layout already clears the top navbar, so only a small pt-4 is needed.
    <main className="w-full px-3 pb-32 pt-14 sm:px-6 md:pb-12 md:pt-4">
      <h1 className="text-2xl font-bold sm:text-3xl">Filtered results</h1>

      {/* Active filters as small chips that wrap instead of one long line */}
      {tags.length > 0 && (
        <div className="mb-4 mt-2 flex flex-wrap gap-1.5 sm:mb-6">
          {tags.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70 ring-1 ring-white/10 sm:text-xs"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <AnimeGrid items={data.media} />
      <Pagination basePath={`/filter?${qs}`} page={page} hasNext={data.pageInfo.hasNextPage} />
    </main>
  );
}