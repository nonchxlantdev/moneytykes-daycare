import { StaffTimeClock } from "@/components/kiosk/staff-time-clock";
import { getActiveOrganization, listStaff } from "@/lib/data";

export default async function KioskStaffPage() {
  const org = await getActiveOrganization();
  const staff = await listStaff(org.id);
  return <StaffTimeClock staff={staff.filter((s) => s.employmentStatus !== "INACTIVE")} />;
}
