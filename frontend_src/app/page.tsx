import AnimeGrid from "@/components/AnimeGrid";
import SearchBar from "@/components/SearchBar";
import { getPopular, getTrending } from "@/lib/api";

export default async function Home() {
  const [trending, popular] = await Promise.all([getTrending(), getPopular()]);
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold">AniCatz</h1>
        <SearchBar />
      </header>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Trending now</h2>
        <AnimeGrid items={trending.media} />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">All-time popular</h2>
        <AnimeGrid items={popular.media} />
      </section>
    </main>
  );
}
