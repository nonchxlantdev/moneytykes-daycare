"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fallback for route error boundaries. Never shows the raw error: in production
 * Next.js replaces server error messages with a digest, and we only show that
 * reference so it can be matched against server logs.
 */
export function ErrorPanel({ error, retry, homeHref = "/dashboard" }: { error: Error & { digest?: string }; retry: () => void; homeHref?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-10 text-center shadow-soft">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-xl font-extrabold text-ink">We couldn&apos;t load this page</h1>
        <p className="mt-1 text-ink-muted">The daycare database may be temporarily unreachable. Please try again in a moment.</p>
        {error.digest && <p className="mt-3 font-mono text-xs text-ink-subtle">Reference: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href={homeHref}>Go home</Link>
        </Button>
      </div>
    </div>
  );
}
