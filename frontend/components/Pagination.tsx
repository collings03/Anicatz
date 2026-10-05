import Link from "next/link";

export default function Pagination({ basePath, page, hasNext }: { basePath: string; page: number; hasNext: boolean }) {
  // basePath may already contain a query string (e.g. "/filter?genre=Action&sort=popular"),
  // so join the page number with "&" in that case, otherwise "?".
  const sep = basePath.includes("?") ? "&" : "?";
  const href = (p: number) => `${basePath}${sep}page=${p}`;

  const btn = "rounded-full px-4 py-2 text-sm transition-colors";
  const on = "bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-teal-400 hover:text-black hover:ring-teal-400";
  const off = "bg-white/[0.02] text-white/25 ring-1 ring-white/5";

  return (
    <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${btn} ${on}`}>
          &larr; Previous
        </Link>
      ) : (
        <span className={`${btn} ${off}`}>&larr; Previous</span>
      )}
      <span className="px-1 text-sm text-white/50">Page {page}</span>
      {hasNext ? (
        <Link href={href(page + 1)} className={`${btn} ${on}`}>
          Next &rarr;
        </Link>
      ) : (
        <span className={`${btn} ${off}`}>Next &rarr;</span>
      )}
    </div>
  );
}