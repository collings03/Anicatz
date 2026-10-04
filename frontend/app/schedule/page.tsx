import type { Metadata } from "next";
import HomeSchedule from "@/components/ScheduleView";

export const metadata: Metadata = {
  title: "Schedule | anicatz",
  description: "Estimated anime airing schedule.",
};

/** Schedule-only page: nothing but the schedule. */
export default function SchedulePage() {
  return (
    // pt-28 clears the top navbar on desktop, pb-32 clears the bottom navbar on phones.
    <main className="mx-auto w-full max-w-5xl px-3 pb-32 pt-8 sm:px-4 md:pb-16 md:pt-28">
      <HomeSchedule />
    </main>
  );
}