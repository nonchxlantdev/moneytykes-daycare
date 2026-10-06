import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChildProfile } from "@/components/children/child-profile";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getChildHistory, getChildRecord, getClassroomList, getMockBilling } from "@/lib/data";
import { can } from "@/lib/server/tenant-context";
import { fullName } from "@/lib/utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/children/[id]">): Promise<Metadata> {
  const { id } = await params;
  const child = UUID.test(id) ? await getChildRecord(id) : null;
  return { title: child ? fullName(child) : "Child not found" };
}

export default async function ChildProfilePage({ params }: PageProps<"/children/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenantContext();
  // Tenant-scoped: a child from another organization is simply "not found".
  const child = await getChildRecord(id);
  if (!child) notFound();

  const [classrooms, history, billing] = await Promise.all([
    getClassroomList(),
    getChildHistory(child.id),
    can(ctx, "payments:view") ? getMockBilling() : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 animate-in fade-in-0 duration-500">
      <Link href="/children" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All children
      </Link>
      <ChildProfile
        child={child}
        classrooms={classrooms}
        history={history}
        billing={billing ? { invoices: billing.invoices.filter((i) => i.childId === child.id), payments: billing.payments.filter((p) => p.childId === child.id) } : null}
      />
    </div>
  );
}
