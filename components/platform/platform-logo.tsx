"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vision Forge platform mark. Place the supplied file at
 * `public/branding/vision-forge-logo.png`. It is shown as-is, with its
 * aspect ratio preserved. A text mark is used only when that file is absent.
 */
export function PlatformLogo({ className }: { className?: string }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return <span className={cn("text-lg font-extrabold tracking-tight", className)}>Vision Forge</span>;
  }

  return (
    <Image
      src="/branding/vision-forge-logo.png"
      alt="Vision Forge"
      width={220}
      height={64}
      unoptimized
      onError={() => setMissing(true)}
      className={cn("h-12 w-auto max-w-[220px] object-contain object-left", className)}
    />
  );
}
