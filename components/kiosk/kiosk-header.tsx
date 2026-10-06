"use client";

import Link from "next/link";
import { LiveClock } from "@/components/shared/live-clock";
import { TenantBrand } from "@/components/shared/tenant-brand";

export function KioskHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-6">
      <Link href="/kiosk" aria-label="Kiosk home" className="rounded-2xl">
        <TenantBrand size="lg" />
      </Link>
      <LiveClock dateClassName="text-sm sm:text-base" timeClassName="text-2xl sm:text-3xl font-extrabold" />
    </header>
  );
}
