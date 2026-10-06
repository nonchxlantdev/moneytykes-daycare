"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared ticking clock. Returns `null` during SSR/hydration so
 * server-rendered markup never mismatches, then the live time.
 */
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 10_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): Date | null {
  const value = useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
  return value === null ? null : new Date(value);
}
