import type { Metadata } from "next";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <OrganizationSettingsForm />;
}
