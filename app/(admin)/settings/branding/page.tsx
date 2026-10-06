import type { Metadata } from "next";
import { BrandingSettings } from "@/components/branding/branding-settings";

export const metadata: Metadata = { title: "Branding" };

export default function BrandingPage() {
  return <BrandingSettings />;
}
