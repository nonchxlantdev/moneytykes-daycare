"use client";

import { Moon, Sun, Sunset } from "lucide-react";
import { LiveClock } from "@/components/shared/live-clock";
import { useOrganization } from "@/components/shared/organization-provider";
import { useNow } from "@/lib/hooks/use-now";
import { greetingFor } from "@/lib/utils";

export function DashboardGreeting({ firstName }: { firstName: string }) {
  const org = useOrganization();
  const now = useNow();
  const greeting = now ? greetingFor(now, org.timezone) : "Welcome back";
  const Icon = greeting === "Good Morning" ? Sun : greeting === "Good Afternoon" ? Sunset : Moon;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {greeting}, {firstName}!
          <Icon className="size-7 text-brand-accent" aria-hidden="true" />
        </h1>
        <p className="mt-1 text-ink-muted sm:text-lg">Here&apos;s what&apos;s happening at {org.name} today.</p>
      </div>
      <LiveClock className="sm:text-right text-left" />
    </div>
  );
}
