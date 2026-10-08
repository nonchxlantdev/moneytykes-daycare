import type { Metadata } from "next";
import { ReportsCenter } from "@/components/reports/reports-center";
import { requirePagePermission } from "@/lib/auth/tenant";
import { getActiveChildRecords, getClassroomList, getMockBilling, getStaffList } from "@/lib/data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requirePagePermission("reports:view");
  const [roster, staff, billing, classrooms] = await Promise.all([
    getActiveChildRecords(),
    getStaffList(),
    getMockBilling(),
    getClassroomList(),
  ]);
  return (
    <ReportsCenter
      roster={roster}
      staff={staff}
      payments={billing.payments}
      classrooms={classrooms.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
