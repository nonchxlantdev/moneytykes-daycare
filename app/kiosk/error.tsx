"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

export default function KioskError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <ErrorPanel error={error} retry={retry} homeHref="/kiosk" />
    </div>
  );
}
