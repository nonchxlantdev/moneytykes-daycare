import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PlannedFeature } from "@/components/shared/planned-feature";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <PlannedFeature
      title="Documents"
      description="Organization-wide policies, forms and templates."
      icon={FileText}
      bullets={["Private storage with short-lived signed links", "Expiry reminders for immunization records", "Per-child documents already live on each child profile"]}
    />
  );
}
