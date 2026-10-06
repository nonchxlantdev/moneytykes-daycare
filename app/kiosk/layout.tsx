import type { Metadata, Viewport } from "next";
import { KioskHeader } from "@/components/kiosk/kiosk-header";
import { DemoBadge } from "@/components/shared/demo-badge";
import { TenantShell } from "@/components/shared/tenant-shell";
import { getCurrentOrganization } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const org = await getCurrentOrganization();
  return { title: `Kiosk · ${org.name}` };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Dedicated full-screen kiosk shell — no admin navigation.
 * Phase 2: runs inside the signed-in operator's session. Phase 3: an
 * authenticated kiosk DEVICE session (attendance/time-clock permissions only).
 */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantShell>
      <div className="kiosk-backdrop relative flex min-h-dvh flex-col overflow-hidden select-none">
        <KioskHeader />
        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-6 pb-8 sm:px-8">{children}</main>
        <footer className="relative z-10 flex justify-center pb-4">
          <DemoBadge>Guardian PIN check is simplified · signatures are not stored yet</DemoBadge>
        </footer>
      </div>
    </TenantShell>
  );
}
