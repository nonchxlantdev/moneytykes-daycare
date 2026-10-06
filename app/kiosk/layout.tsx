import type { Metadata, Viewport } from "next";
import { KioskHeader } from "@/components/kiosk/kiosk-header";
import { DemoBadge } from "@/components/shared/demo-badge";

export const metadata: Metadata = { title: "Kiosk" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Dedicated full-screen kiosk shell — no admin navigation.
 * Production: this route group requires an authenticated kiosk DEVICE
 * session (organization-scoped, attendance/time-clock permissions only).
 */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kiosk-backdrop relative flex min-h-dvh flex-col overflow-hidden select-none">
      <KioskHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-6 pb-8 sm:px-8">{children}</main>
      <footer className="relative z-10 flex justify-center pb-4">
        <DemoBadge>Demo kiosk · PINs are mocked · signatures are not stored</DemoBadge>
      </footer>
    </div>
  );
}
