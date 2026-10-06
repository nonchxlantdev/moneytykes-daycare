import type { Metadata } from "next";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { getActiveOrganization, listChildren, listClassrooms } from "@/lib/data";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const org = await getActiveOrganization();
  const [roster, classrooms] = await Promise.all([listChildren(org.id), listClassrooms(org.id)]);
  return <AttendanceWorkspace roster={roster.filter((c) => c.enrollmentStatus === "ACTIVE")} classrooms={classrooms} />;
}
