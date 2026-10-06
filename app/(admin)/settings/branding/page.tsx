import type { Metadata } from "next";
import { BrandingSettings } from "@/components/branding/branding-settings";
import { requirePagePermission } from "@/lib/auth/tenant";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage() {
  await requirePagePermission("branding:manage");
  return <BrandingSettings />;
}
