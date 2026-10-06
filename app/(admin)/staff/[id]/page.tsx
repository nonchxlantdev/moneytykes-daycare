import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StaffProfile } from "@/components/staff/staff-profile";
import { getActiveOrganization, getStaffMember, listClassrooms } from "@/lib/data";
import { fullName } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/staff/[id]">): Promise<Metadata> {
  const { id } = await params;
  const org = await getActiveOrganization();
  const member = await getStaffMember(org.id, id);
  return { title: member ? fullName(member) : "Staff not found" };
}

export default async function StaffProfilePage({ params }: PageProps<"/staff/[id]">) {
  const { id } = await params;
  const org = await getActiveOrganization();
  const member = await getStaffMember(org.id, id);
  if (!member) notFound();
  const classrooms = await listClassrooms(org.id);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 animate-in fade-in-0 duration-500">
      <Link href="/staff" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All staff
      </Link>
      <StaffProfile member={member} classroomName={classrooms.find((c) => c.id === member.classroomId)?.name} />
    </div>
  );
}
