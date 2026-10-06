import type { Metadata } from "next";
import { ReportsCenter } from "@/components/reports/reports-center";
import { getActiveOrganization, listChildren, listPayments, listStaff } from "@/lib/data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const org = await getActiveOrganization();
  const [roster, staff, payments] = await Promise.all([listChildren(org.id), listStaff(org.id), listPayments(org.id)]);
  return <ReportsCenter roster={roster.filter((c) => c.enrollmentStatus === "ACTIVE")} staff={staff} payments={payments} />;
}
