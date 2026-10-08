import type { Metadata } from "next";
import { CalendarCenter } from "@/components/calendar/calendar-center";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return <CalendarCenter />;
}
