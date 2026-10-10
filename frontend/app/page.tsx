import Link from "next/link";
import AnimeGrid from "@/components/AnimeGrid";
import AnimeRail from "@/components/AnimeRail";
import GenreBox from "@/components/GenreBox";
import HomeSchedule from "@/components/ScheduleView";
import Spotlight from "@/components/Spotlight";
import Top10Tabs from "@/components/Top10Tabs";
import TrendingRail from "@/components/TrendingRail";
import WatchHistoryRail from "@/components/WatchHistoryRail";
import { getBrowse } from "@/lib/api";

const GRID = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6";

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <h2 className="min-w-0 truncate text-lg font-semibold sm:text-xl">{title}</h2>
        <Link href={href} className="shrink-0 text-sm text-teal-400 hover:underline">View more &rarr;</Link>
      </div>
      {children}
    </section>
  );
}

export default async function Home() {
  const [trending, airing, popular, favorite, completed, upcoming] = await Promise.all([
    getBrowse({ sort: "trending", per_page: 20 }),
    getBrowse({ sort: "trending", status: "RELEASING", per_page: 18 }),
    getBrowse({ sort: "popular", per_page: 18 }),
    getBrowse({ sort: "favorite", per_page: 10 }),
    getBrowse({ sort: "latest", status: "FINISHED", per_page: 18 }),
    getBrowse({ sort: "popular", status: "NOT_YET_RELEASED", per_page: 18 }),
  ]);

  const spotlight = trending.media.filter((a) => a.bannerImage).slice(0, 8);

  return (
    // overflow-x-clip: nothing on the page may ever make it wider than the screen.
    <main className="w-full overflow-x-clip pb-12">
      <Spotlight items={spotlight} />

      <section className="min-w-0 px-4 pt-6 sm:px-6 sm:pt-8">
        <h2 className="mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">Trending</h2>
        <TrendingRail items={trending.media.slice(0, 15)} />
      </section>

      <div className="min-w-0 px-4 sm:px-6">
        <WatchHistoryRail />
      </div>

      {/* grid-cols-1 matters: without it the single column grows to its widest child and stretches the page. */}
      <div className="grid grid-cols-1 gap-8 px-4 pt-8 sm:px-6 sm:pt-10 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8 sm:space-y-10">
          <Section title="Upcoming Anime" href="/browse/upcoming">
            <AnimeRail items={upcoming.media} />
          </Section>

          <Section title="Top Airing" href="/browse/top-airing">
            <AnimeGrid items={airing.media} cols={GRID} mobileRail />
          </Section>
          <Section title="Most Popular" href="/browse/most-popular">
            <AnimeGrid items={popular.media} cols={GRID} mobileRail />
          </Section>

          <HomeSchedule />

          <Section title="Latest Completed" href="/browse/completed">
            <AnimeRail items={completed.media} />
          </Section>
        </div>

        <aside className="min-w-0 space-y-8">
          <GenreBox />
          <Top10Tabs
            tabs={[
              { label: "Airing", items: airing.media },
              { label: "Popular", items: popular.media },
              { label: "Favorite", items: favorite.media },
            ]}
          />
        </aside>
      </div>
    </main>
  );
}