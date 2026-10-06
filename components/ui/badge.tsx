import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-ink-muted",
        brand: "bg-primary/10 text-primary",
        secondary: "bg-brand-secondary/12 text-brand-secondary",
        accent: "bg-brand-accent/15 text-[color-mix(in_oklab,var(--brand-accent)_75%,black)]",
        success: "bg-success/12 text-[color-mix(in_oklab,var(--brand-success)_80%,black)]",
        warning: "bg-warning/15 text-[color-mix(in_oklab,var(--brand-warning)_70%,black)]",
        danger: "bg-danger/12 text-[color-mix(in_oklab,var(--brand-danger)_80%,black)]",
        solidSuccess: "bg-success text-success-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
