import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricTone = "brand" | "success" | "accent" | "secondary";

const toneStyles: Record<MetricTone, { icon: string; ring: string; wash: string }> = {
  brand: { icon: "bg-primary/10 text-primary", ring: "var(--brand-primary)", wash: "from-primary/[0.06]" },
  success: { icon: "bg-success/12 text-success", ring: "var(--brand-success)", wash: "from-success/[0.07]" },
  accent: { icon: "bg-brand-accent/15 text-brand-accent", ring: "var(--brand-accent)", wash: "from-brand-accent/[0.08]" },
  secondary: { icon: "bg-brand-secondary/12 text-brand-secondary", ring: "var(--brand-secondary)", wash: "from-brand-secondary/[0.07]" },
};

function ProgressRing({ value, color }: { value: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative size-[52px] shrink-0" role="img" aria-label={`${Math.round(pct)} percent`}>
      <svg viewBox="0 0 56 56" className="size-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-ink tabular">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  percent,
  trend,
  href,
}: {
  label: string;
  value: ReactNode;
  caption: string;
  icon: ElementType;
  tone: MetricTone;
  percent?: number;
  trend?: ReactNode;
  href?: string;
}) {
  const s = toneStyles[tone];
  const body = (
    <>
      <div className="flex items-start gap-3.5">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", s.icon)}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-semibold text-ink">{label}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold tracking-tight text-ink tabular">{value}</p>
            {trend}
          </div>
        </div>
        {percent !== undefined && <ProgressRing value={percent} color={s.ring} />}
        {href && percent === undefined && <ChevronRight className="mt-1 size-5 text-ink-subtle" aria-hidden="true" />}
      </div>
      <p className="mt-3 text-xs font-medium text-ink-muted">{caption}</p>
    </>
  );
  const className = cn(
    "block rounded-2xl border border-line bg-gradient-to-br to-transparent to-60% bg-surface p-4 shadow-soft transition-shadow sm:p-5",
    s.wash,
    href && "hover:shadow-lift",
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
