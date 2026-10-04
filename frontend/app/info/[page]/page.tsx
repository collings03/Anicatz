import Link from "next/link";
import { notFound } from "next/navigation";

const PAGES: Record<string, { title: string; text: string }> = {
  watch2gether: { title: "Watch2gether", text: "Watch together with friends in sync. This feature is coming soon." },
  news: { title: "News", text: "Anime news and site updates will appear here soon." },
  community: { title: "Community", text: "Join the conversation. Community links will be added here soon." },
};

export default async function InfoPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const info = PAGES[page];
  if (!info) notFound();
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-20 text-center">
      <h1 className="mb-4 text-4xl font-bold text-pink-300">{info.title}</h1>
      <p className="mb-8 text-neutral-300">{info.text}</p>
      <Link href="/" className="rounded bg-pink-300 px-6 py-2.5 font-medium text-black hover:bg-pink-200">
        Back to home
      </Link>
    </main>
  );
}