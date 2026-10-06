import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { PlannedFeature } from "@/components/shared/planned-feature";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <PlannedFeature
      title="Messages"
      description="Two-way communication with families."
      icon={MessageSquare}
      bullets={["Announcements to all families or a single class", "Direct messages with guardians", "Read receipts and quiet hours"]}
    />
  );
}
