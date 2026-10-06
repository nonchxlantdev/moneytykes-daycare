import type { Metadata } from "next";
import { AttendanceOverviewChart, CheckInOutTrendChart } from "@/components/dashboard/attendance-charts";
import { CurrentlyAtDaycare } from "@/components/dashboard/currently-at-daycare";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StaffWorking } from "@/components/dashboard/staff-working";
import { TodaysAlerts } from "@/components/dashboard/todays-alerts";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getActiveChildRecords, getAlertInputs, getChildRecords, getStaffList } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const [active, roster, staff, alertInputs] = await Promise.all([
    getActiveChildRecords(),
    getChildRecords(),
    getStaffList(),
    getAlertInputs(),
  ]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
      <AutoRefresh />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardGreeting firstName={ctx.user.name.split(" ")[0]} />
          <DashboardMetrics roster={active} staff={staff} />
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <CurrentlyAtDaycare roster={active} />
            <RecentActivity roster={roster} staff={staff} />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <QuickActions />
          <TodaysAlerts inputs={alertInputs} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <AttendanceOverviewChart />
        <CheckInOutTrendChart />
        <div className="lg:col-span-2 2xl:col-span-1">
          <StaffWorking staff={staff} />
        </div>
      </div>
    </div>
  );
}
