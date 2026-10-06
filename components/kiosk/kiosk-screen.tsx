"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Animated wrapper for each kiosk step (use inside <AnimatePresence mode="wait">). */
export function KioskStep({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -32 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn("flex w-full flex-1 flex-col", className)}
    >
      {children}
    </motion.section>
  );
}

export function KioskTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-6 text-center sm:mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-ink-muted sm:text-xl">{subtitle}</p>}
    </div>
  );
}

export function KioskBackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-14 items-center gap-2 rounded-2xl border border-line bg-surface px-6 text-lg font-semibold text-ink shadow-soft transition-transform hover:bg-muted active:scale-95"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
      {label}
    </button>
  );
}

/** Kiosk-scale primary action button. */
export function KioskButton({
  children,
  onClick,
  disabled,
  tone = "primary",
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "success" | "secondary" | "danger" | "outline";
  className?: string;
  type?: "button" | "submit";
}) {
  const tones = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    secondary: "bg-brand-secondary text-brand-secondary-foreground",
    danger: "bg-danger text-danger-foreground",
    outline: "border border-line bg-surface text-ink",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-16 items-center justify-center gap-3 whitespace-nowrap rounded-2xl px-6 text-lg font-bold shadow-soft sm:px-8 sm:text-xl transition-[transform,opacity] duration-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-6",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}
