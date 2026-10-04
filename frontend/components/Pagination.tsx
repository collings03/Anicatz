import Link from "next/link";

export default function Pagination({ basePath, page, hasNext }: { basePath: string; page: number; hasNext: boolean }) {
  const btn = "rounded border px-4 py-2 text-sm";
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={`${basePath}?page=${page - 1}`} className={`${btn} border-neutral-600 hover:border-teal-400`}>
          &larr; Previous
        </Link>
      ) : (
        <span className={`${btn} border-neutral-800 text-neutral-600`}>&larr; Previous</span>
      )}
      <span className="text-sm text-neutral-400">Page {page}</span>
      {hasNext ? (
        <Link href={`${basePath}?page=${page + 1}`} className={`${btn} border-neutral-600 hover:border-teal-400`}>
          Next &rarr;
        </Link>
      ) : (
        <span className={`${btn} border-neutral-800 text-neutral-600`}>Next &rarr;</span>
      )}
    </div>
  );
}