"use client";

import { Moon, Sun, Sunset } from "lucide-react";
import { LiveClock } from "@/components/shared/live-clock";
import { useOrganization } from "@/components/shared/organization-provider";
import { useNow } from "@/lib/hooks/use-now";
import { greetingFor } from "@/lib/utils";

export function DashboardGreeting({ firstName }: { firstName: string }) {
  const org = useOrganization();
  const now = useNow();
  // Keep the heading stable until the client clock is ready so hydration
  // does not swap "Welcome back" for a time-of-day greeting.
  const greeting = now ? greetingFor(now, org.timezone) : null;
  const Icon = greeting === "Good Morning" ? Sun : greeting === "Good Afternoon" ? Sunset : Moon;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex min-h-9 items-center gap-2 text-2xl font-extrabold tracking-tight text-ink sm:min-h-10 sm:text-3xl">
          {greeting ? (
            <>
              {greeting}, {firstName}!
              <Icon className="size-7 shrink-0 text-brand-accent" aria-hidden="true" />
            </>
          ) : (
            <span className="invisible">
              Good Morning, {firstName}!
              <Sun className="inline size-7" aria-hidden="true" />
            </span>
          )}
        </h1>
        <p className="mt-1 text-ink-muted sm:text-lg">Here&apos;s what&apos;s happening at {org.name} today.</p>
      </div>
      <LiveClock className="sm:text-right text-left" />
    </div>
  );
}
