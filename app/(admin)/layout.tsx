import { AppSidebar } from "@/components/admin/app-sidebar";
import { TopNavigation } from "@/components/admin/top-navigation";
import { getDemoSession } from "@/lib/auth/mock-session";
import { getActiveOrganization } from "@/lib/data";
import { getAlertInputs } from "@/lib/data/alerts";

const roleLabels = { OWNER: "Owner", ADMIN: "Admin", STAFF: "Staff" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, org] = await Promise.all([getDemoSession(), getActiveOrganization()]);
  const alertInputs = await getAlertInputs(org.id);
  const user = { name: session.user.name, roleLabel: roleLabels[session.role] };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavigation user={user} alertInputs={alertInputs} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
