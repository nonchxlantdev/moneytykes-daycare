import type { Metadata } from "next";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { TopNavigation } from "@/components/admin/top-navigation";
import { TenantShell } from "@/components/shared/tenant-shell";
import { getAlertInputs, getCurrentOrganization } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const org = await getCurrentOrganization();
  return {
    title: { default: org.name, template: `%s · ${org.name}` },
    description: `${org.name} — ${org.tagline}`,
    icons: org.branding.logoUrl ? { icon: org.branding.logoUrl } : undefined,
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const alertInputs = await getAlertInputs();
  return (
    <TenantShell>
      <div className="flex min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
          Skip to content
        </a>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavigation alertInputs={alertInputs} />
          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </TenantShell>
  );
}
