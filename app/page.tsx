import Link from "next/link";
import { ArrowRight, LayoutDashboard, Tablet } from "lucide-react";
import { DemoBadge } from "@/components/shared/demo-badge";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { getActiveOrganization } from "@/lib/data";

/**
 * Development entry point. In production this becomes the tenant's
 * sign-in page (resolved by subdomain / custom domain).
 */
export default async function Home() {
  const org = await getActiveOrganization();
  const entries = [
    {
      href: "/dashboard",
      title: "Admin Dashboard",
      body: "Children, attendance, staff, payments, reports and branding.",
      icon: LayoutDashboard,
      className: "from-primary to-[color-mix(in_oklab,var(--brand-primary)_75%,var(--brand-secondary))] text-primary-foreground",
    },
    {
      href: "/kiosk",
      title: "Front Desk Kiosk",
      body: "Tablet check-in / check-out with signatures and the staff time clock.",
      icon: Tablet,
      className: "from-brand-secondary to-[color-mix(in_oklab,var(--brand-secondary)_70%,var(--brand-accent))] text-brand-secondary-foreground",
    },
  ];

  return (
    <main className="kiosk-backdrop flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <OrganizationLogo name={org.name} logoUrl={org.branding.logoUrl} size={84} />
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{org.name}</h1>
          <p className="mt-1 text-lg font-medium text-ink-muted">{org.tagline}</p>
          <DemoBadge className="mt-5">Demo environment · mock sign-in as Sarah Johnson (Admin)</DemoBadge>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {entries.map(({ href, title, body, icon: Icon, className }) => (
            <Link
              key={href}
              href={href}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br p-7 shadow-lift transition-transform hover:-translate-y-0.5 ${className}`}
            >
              <span className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10" aria-hidden="true" />
              <Icon className="size-10" aria-hidden="true" />
              <h2 className="mt-6 text-2xl font-extrabold">{title}</h2>
              <p className="mt-1.5 text-sm opacity-90">{body}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold">
                Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-subtle">
          Sample tenant data. Branding, name and colors are loaded from organization configuration.
        </p>
      </div>
    </main>
  );
}
