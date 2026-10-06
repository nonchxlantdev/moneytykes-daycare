import { StaffTimeClock } from "@/components/kiosk/staff-time-clock";

/** Staff are identified by PIN on the server; no staff list is sent to the kiosk. */
export default function KioskStaffPage() {
  return <StaffTimeClock />;
}
