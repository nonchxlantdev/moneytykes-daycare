import type { Metadata } from "next";
import { StaffDirectory } from "@/components/staff/staff-directory";
import { getActiveOrganization, listClassrooms, listStaff } from "@/lib/data";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const org = await getActiveOrganization();
  const [staff, classrooms] = await Promise.all([listStaff(org.id), listClassrooms(org.id)]);
  return <StaffDirectory staff={staff} classrooms={classrooms} />;
}
