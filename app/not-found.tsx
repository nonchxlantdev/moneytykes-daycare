import Link from "next/link";
import { Building2, Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { getPublicTenantBySlug } from "@/lib/server/services/public-tenant";
import { platformUrl } from "@/lib/tenancy/hostname";
import { getRequestTenancy } from "@/lib/tenancy/request";

/**
 * 404s. On a daycare subdomain whose organization doesn't exist (or a
 * reserved / malformed subdomain) this is the "Daycare not found" page —
 * no other daycare and no sample data is ever shown instead.
 */
async function isUnknownDaycare(): Promise<{ unknown: boolean; homeHref: string }> {
  const tenancy = await getRequestTenancy();
  const { resolution } = tenancy;
  if (resolution.kind === "unscoped") return { unknown: false, homeHref: "/dashboard" };
  const home = platformUrl("/", { host: tenancy.host, protocol: tenancy.protocol, rootDomain: resolution.rootDomain });
  if (resolution.kind === "platform") return { unknown: false, homeHref: "/" };
  if (resolution.kind !== "tenant") return { unknown: true, homeHref: home };
  try {
    return { unknown: (await getPublicTenantBySlug(getDb(), resolution.slug)) === null, homeHref: home };
  } catch {
    return { unknown: false, homeHref: "/dashboard" };
  }
}

export default async function NotFound() {
  const { unknown, homeHref } = await isUnknownDaycare();
  return (
    <main className="kiosk-backdrop flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-lg rounded-3xl border border-line bg-surface shadow-soft">
        {unknown ? (
          <EmptyState
            icon={Building2}
            title="Daycare not found"
            description="There's no daycare at this address. Check the spelling of the link, or ask your daycare for the correct address."
            action={
              <Button asChild>
                <a href={homeHref}>Go to Vision Forge</a>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Compass}
            title="Page not found"
            description="That page doesn't exist or has moved."
            action={
              <Button asChild>
                <Link href={homeHref === "/" ? "/" : "/dashboard"}>Go to dashboard</Link>
              </Button>
            }
          />
        )}
      </div>
    </main>
  );
}
