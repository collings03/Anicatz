import { redirect } from "next/navigation";
import { getBrowse } from "@/lib/api";
import { animeSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RandomPage() {
  const page = 1 + Math.floor(Math.random() * 10);
  const data = await getBrowse({ sort: "popular", page, per_page: 50 }).catch(() => null);
  const pool = data?.media ?? [];
  if (!pool.length) redirect("/");
  redirect(`/anime/${animeSlug(pool[Math.floor(Math.random() * pool.length)])}`);
}