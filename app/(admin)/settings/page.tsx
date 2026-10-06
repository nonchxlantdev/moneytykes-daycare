import type { Metadata } from "next";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { requirePagePermission } from "@/lib/auth/tenant";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePagePermission("settings:manage");
  return <OrganizationSettingsForm />;
}
