import type { Metadata } from "next";
import HomeSchedule from "@/components/ScheduleView";

export const metadata: Metadata = {
  title: "Schedule | anicatz",
  description: "Estimated anime airing schedule.",
};

/** Schedule-only page: nothing but the schedule. */
export default function SchedulePage() {
  return (
    // pt-14 clears the pinned logo on phones (about 24px of space below it).
    // On desktop the layout already clears the top navbar, so only a small pt-4 is needed.
    // pb-32 clears the bottom navbar on phones.
    <main className="mx-auto w-full max-w-5xl px-3 pb-32 pt-14 sm:px-4 md:pb-16 md:pt-4">
      <HomeSchedule />
    </main>
  );
}