import type { Metadata } from "next";
import { StaffDirectory } from "@/components/staff/staff-directory";
import { getClassroomList, getStaffList } from "@/lib/data";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const [staff, classrooms] = await Promise.all([getStaffList(), getClassroomList()]);
  return <StaffDirectory staff={staff} classrooms={classrooms} />;
}
