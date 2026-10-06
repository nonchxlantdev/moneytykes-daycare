"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

/** Catches errors from top-level layouts (e.g. the tenant layout can't reach D1). */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="kiosk-backdrop flex min-h-dvh items-center justify-center p-6">
      <ErrorPanel error={error} retry={retry} />
    </main>
  );
}
