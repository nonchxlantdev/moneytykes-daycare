import Link from "next/link";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

export type KioskTone = "success" | "primary" | "secondary" | "accent";

const tones: Record<KioskTone, string> = {
  success: "from-success to-[color-mix(in_oklab,var(--brand-success)_80%,black)] text-success-foreground shadow-[0_18px_40px_-16px_color-mix(in_oklab,var(--brand-success)_80%,transparent)]",
  primary: "from-primary to-[color-mix(in_oklab,var(--brand-primary)_80%,black)] text-primary-foreground shadow-[0_18px_40px_-16px_color-mix(in_oklab,var(--brand-primary)_80%,transparent)]",
  secondary: "from-brand-secondary to-[color-mix(in_oklab,var(--brand-secondary)_80%,black)] text-brand-secondary-foreground shadow-[0_18px_40px_-16px_color-mix(in_oklab,var(--brand-secondary)_80%,transparent)]",
  accent: "from-brand-accent to-[color-mix(in_oklab,var(--brand-accent)_85%,black)] text-brand-accent-foreground shadow-[0_18px_40px_-16px_color-mix(in_oklab,var(--brand-accent)_80%,transparent)]",
};

/** Giant touch tile for kiosk home. Minimum ~160px tall. */
export function KioskActionButton({
  href,
  title,
  subtitle,
  icon: Icon,
  tone,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon: ElementType;
  tone: KioskTone;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-40 items-center gap-5 overflow-hidden rounded-[2rem] bg-gradient-to-br p-6 transition-transform duration-150 active:scale-[0.97] sm:min-h-44 sm:p-8",
        tones[tone],
      )}
    >
      <span className="absolute -top-12 -right-10 size-40 rounded-full bg-white/10" aria-hidden="true" />
      <span className="absolute -bottom-16 left-1/3 size-32 rounded-full bg-white/[0.07]" aria-hidden="true" />
      <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 sm:size-20">
        <Icon className="size-9 sm:size-11" aria-hidden="true" />
      </span>
      <span className="relative">
        <span className="block text-2xl leading-tight font-extrabold sm:text-3xl">{title}</span>
        {subtitle && <span className="mt-1 block text-sm font-medium opacity-90 sm:text-base">{subtitle}</span>}
      </span>
    </Link>
  );
}
