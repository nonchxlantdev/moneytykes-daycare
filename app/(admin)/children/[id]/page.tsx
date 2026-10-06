import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChildProfile } from "@/components/children/child-profile";
import { getActiveOrganization, getChild, listChildDocuments, listClassrooms, listInvoices, listPayments } from "@/lib/data";
import { fullName } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/children/[id]">): Promise<Metadata> {
  const { id } = await params;
  const org = await getActiveOrganization();
  const child = await getChild(org.id, id);
  return { title: child ? fullName(child) : "Child not found" };
}

export default async function ChildProfilePage({ params }: PageProps<"/children/[id]">) {
  const { id } = await params;
  const org = await getActiveOrganization();
  const child = await getChild(org.id, id);
  if (!child) notFound();

  const [classrooms, invoices, payments, documents] = await Promise.all([
    listClassrooms(org.id),
    listInvoices(org.id),
    listPayments(org.id),
    listChildDocuments(org.id, child.id),
  ]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 animate-in fade-in-0 duration-500">
      <Link href="/children" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All children
      </Link>
      <ChildProfile
        child={child}
        classroom={classrooms.find((c) => c.id === child.classroomId)!}
        invoices={invoices.filter((i) => i.childId === child.id)}
        payments={payments.filter((p) => p.childId === child.id)}
        documents={documents}
      />
    </div>
  );
}
