
import HLSPlayer from "@/components/HLSPlayer";

export default function TestPlayerPage() {
  return (
    <main className="min-h-screen bg-black p-4">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-xl font-bold text-white">
          HLS Player Test
        </h1>

        <div className="aspect-video overflow-hidden rounded-xl">
          <HLSPlayer
            src="https://hls.dramahot.top/p/scxqicy/ta9t4m1bhw/cm72fkvbpx/09qmw7k6mi5nzd/master.m3u8"
          />
        </div>
      </div>
    </main>
  );
}
