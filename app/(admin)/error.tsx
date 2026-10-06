"use client";

import { ErrorPanel } from "@/components/shared/error-panel";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="pt-10">
      <ErrorPanel error={error} retry={retry} />
    </div>
  );
}
