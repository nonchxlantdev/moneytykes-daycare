import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
        secondary: "bg-brand-secondary text-brand-secondary-foreground shadow-soft hover:bg-brand-secondary/90",
        success: "bg-success text-success-foreground shadow-soft hover:bg-success/90",
        destructive: "bg-danger text-danger-foreground shadow-soft hover:bg-danger/90",
        outline: "border border-line bg-surface text-ink shadow-soft hover:bg-muted",
        soft: "bg-primary/10 text-primary hover:bg-primary/15",
        ghost: "text-ink-muted hover:bg-muted hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-16 rounded-2xl px-8 text-lg",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
