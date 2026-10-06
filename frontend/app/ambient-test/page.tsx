// Save as: frontend/app/ambient-test/page.tsx   (then open /ambient-test)
// A quick way to see the real YouTube-style ambient effect. The sample is an open-licence film;
// replace the address with any direct .mp4 or .m3u8 you are allowed to use.
import AmbientVideo from "@/components/Ambientvideo";

const SAMPLE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function AmbientTest() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-32 pt-8">
      <h1 className="mb-6 text-2xl font-semibold">Ambient mode test</h1>
      <AmbientVideo src={SAMPLE} />
    </main>
  );
}