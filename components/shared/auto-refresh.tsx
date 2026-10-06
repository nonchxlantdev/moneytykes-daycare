"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches server data on an interval while the tab is visible, so
 * attendance recorded on another device (e.g. the front-desk kiosk)
 * appears without a manual reload. Client state is preserved.
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}
