"use client";

import { useEffect } from "react";
import { Delete, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * Large PIN keypad. Controlled: parent owns `value`. Calls `onComplete`
 * once `length` digits are entered. Physical keyboards work too.
 * Digits are masked on screen — the PIN is never echoed.
 */
export function NumericKeypad({
  value,
  onChange,
  onComplete,
  length = 4,
  disabled = false,
  busy = false,
  error,
  label = "PIN",
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  busy?: boolean;
  error?: string;
  label?: string;
}) {
  const press = (digit: string) => {
    if (disabled || busy || value.length >= length) return;
    const next = value + digit;
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };
  const backspace = () => !disabled && !busy && onChange(value.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keyClass =
    "flex h-[4.5rem] items-center justify-center rounded-2xl border border-line bg-surface text-3xl font-bold text-ink shadow-soft transition-[transform,background-color] duration-100 hover:bg-muted active:scale-95 active:bg-primary/10 disabled:opacity-40 sm:h-20";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5 flex items-center justify-center gap-4" role="status" aria-label={`${label}: ${value.length} of ${length} digits entered`}>
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-5 rounded-full border-2 transition-all duration-150",
              i < value.length ? "scale-110 border-primary bg-primary" : "border-line-strong bg-surface",
              error && "border-danger bg-danger/80",
            )}
          />
        ))}
        {busy && <LoaderCircle className="size-5 animate-spin text-primary" aria-label="Verifying" />}
      </div>
      <p role="alert" className="mb-3 min-h-5 text-center text-sm font-semibold text-danger">
        {error}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button key={k} type="button" className={keyClass} onClick={() => press(k)} disabled={disabled || busy}>
            {k}
          </button>
        ))}
        <button type="button" className={cn(keyClass, "text-ink-muted")} onClick={backspace} disabled={disabled || busy || !value} aria-label="Delete last digit">
          <Delete className="size-8" />
        </button>
        <button type="button" className={keyClass} onClick={() => press("0")} disabled={disabled || busy}>
          0
        </button>
        <button
          type="button"
          className={cn(keyClass, "text-base font-semibold text-ink-muted")}
          onClick={() => onChange("")}
          disabled={disabled || busy || !value}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
