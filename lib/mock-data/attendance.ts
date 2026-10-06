import type { AttendanceEvent } from "@/types/domain";
import { mockChildren } from "./children";
import { demoDate, demoTime, minutesToHHMM, previousWeekdayOffsets, seededRandom } from "./demo-clock";
import { mockChildGuardians } from "./guardians";
import { ORG_ID } from "./organization";

/**
 * Event-based attendance seed. There is deliberately NO `checkedIn`
 * flag anywhere — current status is derived from these events by
 * lib/attendance/derive.ts.
 */

/** Children currently at daycare today (check-in only). */
const presentToday: Array<[childId: string, checkIn: string]> = [
  ["amari-young", "08:15"],
  ["emma-white", "08:18"],
  ["sophie-jones", "08:20"],
  ["jayden-smith", "08:22"],
  ["liam-carter", "08:25"],
  ["olivia-martin", "08:30"],
  ["ethan-wilson", "08:37"],
  ["noah-brown", "08:41"],
  ["mia-garcia", "07:32"],
  ["lucas-ramirez", "07:36"],
  ["isabella-lewis", "07:41"],
  ["elijah-walker", "07:44"],
  ["chloe-hall", "07:48"],
  ["james-allen", "07:52"],
  ["zoe-king", "07:55"],
  ["benjamin-wright", "08:01"],
  ["layla-scott", "08:04"],
  ["daniel-green", "08:07"],
  ["aria-baker", "08:10"],
  ["henry-adams", "08:11"],
  ["nora-nelson", "08:12"],
  ["sebastian-hill", "08:13"],
];

/** Half-day / early-pickup children who have already left. */
const checkedOutToday: Array<[childId: string, checkIn: string, checkOut: string]> = [
  ["grace-campbell", "07:15", "11:45"],
  ["jack-mitchell", "07:18", "12:00"],
  ["lily-roberts", "07:20", "12:10"],
  ["owen-turner", "07:24", "12:15"],
  ["hannah-phillips", "07:26", "12:30"],
  ["caleb-evans", "07:28", "12:40"],
  ["ella-edwards", "07:34", "12:45"],
  ["wyatt-collins", "07:38", "13:00"],
  ["stella-morris", "07:46", "13:10"],
  ["leo-rogers", "07:58", "13:20"],
];
// Not yet arrived today: ava-thompson, mason-clark.

function guardianFor(childId: string, primary: boolean): string | undefined {
  const pickups = mockChildGuardians.filter((l) => l.childId === childId && l.canPickUp);
  return (pickups.find((l) => l.isPrimary === primary) ?? pickups[0])?.guardianId;
}

function signatureKey(eventId: string, date: string): string {
  return `orgs/${ORG_ID}/signatures/${date}/${eventId}.png`;
}

export function buildAttendanceEvents(): AttendanceEvent[] {
  const events: AttendanceEvent[] = [];
  let n = 0;
  const push = (childId: string, type: AttendanceEvent["type"], hhmm: string, daysAgo: number) => {
    const id = `att_${n++}`;
    events.push({
      id,
      organizationId: ORG_ID,
      childId,
      guardianId: guardianFor(childId, type === "CHECK_IN"),
      type,
      eventTime: demoTime(hhmm, daysAgo),
      deviceId: "dev_front_desk_ipad",
      signatureObjectKey: signatureKey(id, demoDate(daysAgo)),
    });
  };

  // History: previous 10 weekdays, ~93% attendance.
  const rand = seededRandom(7);
  for (const daysAgo of previousWeekdayOffsets(10).reverse()) {
    for (const child of mockChildren) {
      if (rand() < 0.07) continue;
      const checkIn = 435 + Math.floor(rand() * 85); // 7:15 – 8:40
      const checkOut = 930 + Math.floor(rand() * 135); // 3:30 – 5:45
      push(child.id, "CHECK_IN", minutesToHHMM(checkIn), daysAgo);
      push(child.id, "CHECK_OUT", minutesToHHMM(checkOut), daysAgo);
    }
  }

  for (const [childId, checkIn] of presentToday) push(childId, "CHECK_IN", checkIn, 0);
  for (const [childId, checkIn, checkOut] of checkedOutToday) {
    push(childId, "CHECK_IN", checkIn, 0);
    push(childId, "CHECK_OUT", checkOut, 0);
  }

  return events.sort((a, b) => a.eventTime.localeCompare(b.eventTime));
}

