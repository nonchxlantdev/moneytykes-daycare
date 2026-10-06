"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const CONFETTI = [
  { x: -260, y: -140, r: 30, c: "var(--brand-primary)" },
  { x: 240, y: -160, r: -20, c: "var(--brand-accent)" },
  { x: -300, y: 20, r: 60, c: "var(--brand-secondary)" },
  { x: 290, y: 10, r: -45, c: "var(--brand-success)" },
  { x: -200, y: 140, r: 15, c: "var(--brand-accent)" },
  { x: 210, y: 150, r: 80, c: "var(--brand-primary)" },
  { x: -120, y: -200, r: -60, c: "var(--brand-success)" },
  { x: 130, y: -210, r: 40, c: "var(--brand-secondary)" },
  { x: -340, y: -60, r: 10, c: "var(--brand-danger)" },
  { x: 350, y: -80, r: -10, c: "var(--brand-danger)" },
];

/**
 * Big animated success state shared by check-in, check-out and the
 * staff clock. Optionally counts down and calls `onTimeout` so the
 * kiosk resets itself for the next family.
 */
export function SuccessConfirmation({
  title,
  headline,
  detail,
  message,
  tone = "success",
  actions,
  autoResetSeconds,
  onTimeout,
}: {
  title: string;
  headline: string;
  detail: string;
  message?: string;
  tone?: "success" | "primary";
  actions: React.ReactNode;
  autoResetSeconds?: number;
  onTimeout?: () => void;
}) {
  const reduce = useReducedMotion();
  const [remaining, setRemaining] = useState(autoResetSeconds ?? 0);

  useEffect(() => {
    if (!autoResetSeconds) return;
    const id = setInterval(() => setRemaining((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [autoResetSeconds]);

  useEffect(() => {
    if (autoResetSeconds && remaining <= 0) onTimeout?.();
  }, [remaining, autoResetSeconds, onTimeout]);

  const color = tone === "success" ? "var(--brand-success)" : "var(--brand-primary)";

  return (
    <div className="relative flex flex-col items-center px-6 py-6 text-center" role="status" aria-live="polite">
      {!reduce && (
        <div className="pointer-events-none absolute top-24 left-1/2" aria-hidden="true">
          {CONFETTI.map((p, i) => (
            <motion.span
              key={i}
              className="absolute block h-3.5 w-2 rounded-full"
              style={{ backgroundColor: p.c }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
              animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0.85], rotate: p.r * 4, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.25 + i * 0.02, ease: [0.2, 0.8, 0.2, 1] }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative flex size-36 items-center justify-center rounded-full sm:size-40"
        style={{ backgroundColor: color, boxShadow: `0 24px 60px -18px ${color}` }}
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: `6px solid ${color}` }}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={reduce ? undefined : { scale: 1.45, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          aria-hidden="true"
        />
        <svg viewBox="0 0 52 52" className="size-20 sm:size-24" aria-hidden="true">
          <motion.path
            d="M14 27 L23 36 L39 18"
            fill="none"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={reduce ? false : { y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-8"
      >
        <h2 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{title}</h2>
        <p className={cn("mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl")} style={{ color }}>
          {headline}
        </p>
        <p className="mt-3 text-xl text-ink-muted">{detail}</p>
        {message && (
          <p className="mx-auto mt-6 inline-flex rounded-2xl bg-success/12 px-8 py-4 text-xl font-bold text-[color-mix(in_oklab,var(--brand-success)_75%,black)]">
            {message}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
      >
        {actions}
      </motion.div>
      {autoResetSeconds ? (
        <p className="mt-5 text-sm text-ink-subtle tabular">Returning to the welcome screen in {Math.max(0, remaining)}s</p>
      ) : null}
    </div>
  );
}
