"use client";

import { Search, X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<ComponentProps<"input">, "onChange" | "value" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  size?: "md" | "lg" | "xl";
  label?: string;
}

export function SearchInput({ value, onValueChange, size = "md", label = "Search", className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-subtle",
          size === "xl" ? "left-5 size-6" : "left-3.5 size-[18px]",
        )}
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-input bg-surface text-ink placeholder:text-ink-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 [&::-webkit-search-cancel-button]:appearance-none",
          size === "md" && "h-10 pr-9 pl-10 text-sm",
          size === "lg" && "h-12 pr-10 pl-10 text-base",
          size === "xl" && "h-16 rounded-2xl pr-14 pl-14 text-xl",
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-subtle hover:bg-muted hover:text-ink",
            size === "xl" ? "right-4" : "right-2.5",
          )}
          aria-label="Clear search"
        >
          <X className={size === "xl" ? "size-6" : "size-4"} />
        </button>
      )}
    </div>
  );
}
