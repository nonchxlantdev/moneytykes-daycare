import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { PlannedFeature } from "@/components/shared/planned-feature";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PlannedFeature
      title="Calendar"
      description="Closures, events and staff schedules in one place."
      icon={Calendar}
      bullets={["Holiday & closure days (excluded from attendance rates)", "Field trips and parent events", "Staff rota planning"]}
    />
  );
}
