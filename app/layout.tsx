import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { OrganizationProvider } from "@/components/shared/organization-provider";
import { getActiveOrganization, listAttendanceEvents, listStaffTimeEvents } from "@/lib/data";
import { DemoStoreProvider } from "@/lib/store/demo-store";
import { brandCssVars } from "@/lib/theme/brand-css-vars";

export async function generateMetadata(): Promise<Metadata> {
  const org = await getActiveOrganization();
  return {
    title: { default: org.name, template: `%s · ${org.name}` },
    description: `${org.name} — ${org.tagline}`,
    icons: org.branding.logoUrl ? { icon: org.branding.logoUrl } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fc",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = await getActiveOrganization();
  const [attendanceEvents, staffTimeEvents] = await Promise.all([
    listAttendanceEvents(organization.id),
    listStaffTimeEvents(organization.id),
  ]);

  return (
    <html lang="en" style={brandCssVars(organization.branding) as CSSProperties}>
      <body>
        <OrganizationProvider organization={organization}>
          <DemoStoreProvider initialAttendanceEvents={attendanceEvents} initialStaffTimeEvents={staffTimeEvents}>
            {children}
          </DemoStoreProvider>
        </OrganizationProvider>
      </body>
    </html>
  );
}
