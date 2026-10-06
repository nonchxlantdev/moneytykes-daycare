import type { Metadata } from "next";
import { ReportsCenter } from "@/components/reports/reports-center";
import { requirePagePermission } from "@/lib/auth/tenant";
import { getActiveChildRecords, getMockBilling, getStaffList } from "@/lib/data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requirePagePermission("reports:view");
  const [roster, staff, billing] = await Promise.all([getActiveChildRecords(), getStaffList(), getMockBilling()]);
  return <ReportsCenter roster={roster} staff={staff} payments={billing.payments} />;
}
