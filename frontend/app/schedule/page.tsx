import ScheduleView from "@/components/ScheduleView";
import { clientLang } from "@/lib/lang";

export default function SchedulePage() {
  return (
    <main className="w-full py-8">
      <h1 className="mb-6 px-6 text-3xl font-bold">Release schedule</h1>
      <ScheduleView />
    </main>
  );
}