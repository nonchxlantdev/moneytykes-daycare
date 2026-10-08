import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { getOptionalIdentity } from "@/lib/auth/credentials";
import { getDb } from "@/lib/db";
import { isDemoDataMode } from "@/lib/demo-data/mode";
import { ROLE_LABELS } from "@/lib/server/permissions";
import { listUsableMemberships } from "@/lib/server/tenant-context";
import { tenantUrl } from "@/lib/tenancy/hostname";
import { getRequestTenancy } from "@/lib/tenancy/request";

export const metadata: Metadata = { title: { absolute: "Choose a daycare · Vision Forge" } };

/** Platform domain only: a signed-in user who belongs to more than one daycare picks one. */
export default async function SelectDaycarePage() {
  const user = await getOptionalIdentity();
  if (!user) redirect("/login");
  const tenancy = await getRequestTenancy();
  if (isDemoDataMode()) redirect("/dashboard");
  const memberships = await listUsableMemberships(getDb(), user.authProviderId);
  if (memberships.length === 0) redirect("/no-access");

  const href = (slug: string) =>
    tenancy.resolution.kind === "platform" || tenancy.resolution.kind === "tenant"
      ? tenantUrl(slug, "/dashboard", { host: tenancy.host, protocol: tenancy.protocol, rootDomain: tenancy.resolution.rootDomain })
      : "/dashboard"; // pre-cutover test URLs have no daycare subdomains

  return (
    <main className="kiosk-backdrop flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Choose a daycare</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Your account belongs to more than one daycare.</p>
        <ul className="mt-6 flex flex-col gap-2">
          {memberships.map((m) => (
            <li key={m.organizationId}>
              <a
                href={href(m.slug)}
                className="flex items-center gap-3 rounded-2xl border border-line p-4 transition-colors hover:bg-muted"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{m.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {m.slug} · {ROLE_LABELS[m.role]}
                  </span>
                </span>
                <ChevronRight className="size-5 text-ink-subtle" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="ghost" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
