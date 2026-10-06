import type { Metadata } from "next";
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { getActiveChildRecords, getClassroomList } from "@/lib/data";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const [roster, classrooms] = await Promise.all([getActiveChildRecords(), getClassroomList()]);
  return (
    <>
      <AutoRefresh />
      <AttendanceWorkspace roster={roster} classrooms={classrooms} />
    </>
  );
}
