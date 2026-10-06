import type { Staff, StaffTimeEvent } from "@/types/domain";
import { demoTime, minutesToHHMM, previousWeekdayOffsets, seededRandom } from "./demo-clock";
import { ORG_ID } from "./organization";

export const mockStaff: Staff[] = [
  { id: "sarah-wilson", organizationId: ORG_ID, firstName: "Sarah", lastName: "Wilson", role: "Lead Teacher", classroomId: "toddlers", phone: "+501 610-2231", email: "sarah.w@littlestars.example", hiredOn: "2022-01-10", employmentStatus: "ACTIVE" },
  { id: "michael-carter", organizationId: ORG_ID, firstName: "Michael", lastName: "Carter", role: "Assistant Teacher", classroomId: "preschool", phone: "+501 612-8890", email: "michael.c@littlestars.example", hiredOn: "2023-03-06", employmentStatus: "ACTIVE" },
  { id: "jasmine-green", organizationId: ORG_ID, firstName: "Jasmine", lastName: "Green", role: "Teacher", classroomId: "pre-k", phone: "+501 615-4402", email: "jasmine.g@littlestars.example", hiredOn: "2022-08-22", employmentStatus: "ACTIVE" },
  { id: "david-thompson", organizationId: ORG_ID, firstName: "David", lastName: "Thompson", role: "Support Staff", phone: "+501 618-7713", email: "david.t@littlestars.example", hiredOn: "2024-02-12", employmentStatus: "ACTIVE" },
  { id: "maria-lopez", organizationId: ORG_ID, firstName: "Maria", lastName: "Lopez", role: "Infant Caregiver", classroomId: "infants", phone: "+501 620-1185", email: "maria.l@littlestars.example", hiredOn: "2021-09-01", employmentStatus: "ACTIVE" },
  { id: "kevin-brooks", organizationId: ORG_ID, firstName: "Kevin", lastName: "Brooks", role: "Teacher", classroomId: "preschool", phone: "+501 622-5508", email: "kevin.b@littlestars.example", hiredOn: "2024-06-17", employmentStatus: "ACTIVE" },
  { id: "angela-reyes", organizationId: ORG_ID, firstName: "Angela", lastName: "Reyes", role: "Cook", phone: "+501 624-3390", email: "angela.r@littlestars.example", hiredOn: "2023-11-01", employmentStatus: "ACTIVE" },
  { id: "jasmine-lee", organizationId: ORG_ID, firstName: "Jasmine", lastName: "Lee", role: "Assistant Teacher", classroomId: "infants", phone: "+501 626-9921", email: "jasmine.l@littlestars.example", hiredOn: "2025-01-13", employmentStatus: "ON_LEAVE", leaveReason: "Sick Leave" },
];

/** Today's clock events. */
const todayShifts: Array<[staffId: string, clockIn: string, clockOut?: string]> = [
  ["maria-lopez", "08:12"],
  ["sarah-wilson", "07:45"],
  ["michael-carter", "07:50"],
  ["jasmine-green", "08:00"],
  ["kevin-brooks", "08:15"],
  ["david-thompson", "08:10"],
  ["angela-reyes", "06:30", "11:30"],
];

export function buildStaffTimeEvents(): StaffTimeEvent[] {
  const events: StaffTimeEvent[] = [];
  let n = 0;
  const push = (staffId: string, type: StaffTimeEvent["type"], eventTime: string) =>
    events.push({ id: `ste_${n++}`, organizationId: ORG_ID, staffId, type, eventTime, deviceId: "dev_front_desk_ipad" });

  // History: previous 10 weekdays.
  const rand = seededRandom(42);
  for (const daysAgo of previousWeekdayOffsets(10).reverse()) {
    for (const s of mockStaff) {
      if (s.employmentStatus !== "ACTIVE" && daysAgo < 3) continue;
      if (rand() < 0.05) continue; // occasional day off
      const start = s.id === "angela-reyes" ? 390 : 450 + Math.floor(rand() * 35);
      const length = s.id === "angela-reyes" ? 300 : 480 + Math.floor(rand() * 60);
      push(s.id, "CLOCK_IN", demoTime(minutesToHHMM(start), daysAgo));
      push(s.id, "CLOCK_OUT", demoTime(minutesToHHMM(start + length), daysAgo));
    }
  }

  for (const [staffId, clockIn, clockOut] of todayShifts) {
    push(staffId, "CLOCK_IN", demoTime(clockIn));
    if (clockOut) push(staffId, "CLOCK_OUT", demoTime(clockOut));
  }
  return events;
}

