import "server-only";

import bcrypt from "bcryptjs";
import type {
  AttendanceEvent,
  AttendanceEventType,
  ChildRecord,
  EnrollmentStatus,
  Staff,
  StaffEmploymentStatus,
  StaffTimeEvent,
  StaffTimeEventType,
} from "@/types/domain";
import { AppError } from "@/lib/server/errors";
import {
  checkInChildSchema,
  checkOutChildSchema,
  clockInStaffSchema,
  verifyStaffPinSchema,
} from "@/lib/validation/mutations";
import {
  DEMO_ORG_ID,
  DEMO_STAFF_PIN_HASHES,
  buildDemoSeedEvents,
  demoRoster as baseRoster,
  demoStaff as baseStaff,
} from "./fixtures";

interface DemoState {
  seeded: boolean;
  attendance: AttendanceEvent[];
  staffTime: StaffTimeEvent[];
  childStatus: Map<string, EnrollmentStatus>;
  staffStatus: Map<string, { employmentStatus: StaffEmploymentStatus; statusNote?: string }>;
  clientAttendance: Map<string, string>;
  clientStaffTime: Map<string, string>;
}

const globalKey = "__moneytykes_demo_store__";

function state(): DemoState {
  const g = globalThis as typeof globalThis & { [globalKey]?: DemoState };
  if (!g[globalKey]) {
    g[globalKey] = {
      seeded: false,
      attendance: [],
      staffTime: [],
      childStatus: new Map(),
      staffStatus: new Map(),
      clientAttendance: new Map(),
      clientStaffTime: new Map(),
    };
  }
  return g[globalKey]!;
}

function ensureSeeded() {
  const s = state();
  if (s.seeded) return;
  const seed = buildDemoSeedEvents();
  s.attendance = seed.attendance;
  s.staffTime = seed.staffTime;
  s.seeded = true;
}

export function getDemoRoster(): ChildRecord[] {
  ensureSeeded();
  const s = state();
  return baseRoster
    .map((c) => {
      const status = s.childStatus.get(c.id);
      return status ? { ...c, enrollmentStatus: status } : c;
    })
    .filter((c) => c.enrollmentStatus !== "WITHDRAWN");
}

export function getDemoRosterAll(): ChildRecord[] {
  ensureSeeded();
  const s = state();
  return baseRoster.map((c) => {
    const status = s.childStatus.get(c.id);
    return status ? { ...c, enrollmentStatus: status } : c;
  });
}

export function getDemoStaff(): Staff[] {
  ensureSeeded();
  const s = state();
  return baseStaff
    .map((m) => {
      const overlay = s.staffStatus.get(m.id);
      return overlay ? { ...m, ...overlay } : m;
    })
    .filter((m) => m.employmentStatus !== "TERMINATED");
}

export function getDemoStaffAll(): Staff[] {
  ensureSeeded();
  const s = state();
  return baseStaff.map((m) => {
    const overlay = s.staffStatus.get(m.id);
    return overlay ? { ...m, ...overlay } : m;
  });
}

export function getDemoAttendanceEvents(): AttendanceEvent[] {
  ensureSeeded();
  return [...state().attendance].sort((a, b) => b.eventTime.localeCompare(a.eventTime));
}

export function getDemoStaffTimeEvents(): StaffTimeEvent[] {
  ensureSeeded();
  return [...state().staffTime].sort((a, b) => b.eventTime.localeCompare(a.eventTime));
}

function dayStartIso(now: Date): string {
  // Approximate "operational day" in Belize as local midnight UTC-6
  const key = now.toLocaleDateString("en-CA", { timeZone: "America/Belize" });
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 6, 0, 0)).toISOString(); // 00:00 Belize ≈ 06:00 UTC
}

function latestAttendance(childId: string, since: string): AttendanceEvent | undefined {
  return state()
    .attendance.filter((e) => e.childId === childId && e.eventTime >= since)
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime))
    .at(-1);
}

function latestStaffTime(staffId: string, since: string): StaffTimeEvent | undefined {
  return state()
    .staffTime.filter((e) => e.staffId === staffId && e.eventTime >= since)
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime))
    .at(-1);
}

export async function demoRecordAttendance(
  type: AttendanceEventType,
  raw: unknown,
  now = new Date(),
): Promise<{ event: AttendanceEvent; duplicate: boolean }> {
  ensureSeeded();
  const schema = type === "CHECK_IN" ? checkInChildSchema : checkOutChildSchema;
  const v = schema.parse(raw);
  const s = state();

  const existingId = s.clientAttendance.get(v.clientEventId);
  if (existingId) {
    const event = s.attendance.find((e) => e.id === existingId);
    if (event) return { event, duplicate: true };
  }

  const child = getDemoRosterAll().find((c) => c.id === v.childId);
  if (!child || child.enrollmentStatus === "WITHDRAWN") {
    throw new AppError("NOT_FOUND", "Child not found.");
  }
  const guardianId =
    v.guardianId ??
    child.guardians.find((g) => g.link.canPickUp && g.link.isPrimary)?.guardian.id ??
    child.guardians.find((g) => g.link.canPickUp)?.guardian.id;
  if (!guardianId) throw new AppError("VALIDATION", "Please choose who is signing.");
  const canPickup = child.guardians.some((g) => g.guardian.id === guardianId && g.link.canPickUp);
  if (!canPickup) throw new AppError("FORBIDDEN", "That guardian isn't authorized to pick up this child.");

  const since = dayStartIso(now);
  const latest = latestAttendance(child.id, since);
  if (type === "CHECK_IN" && latest?.type === "CHECK_IN") {
    throw new AppError("ALREADY_CHECKED_IN", `${child.firstName} is already checked in.`);
  }
  if (type === "CHECK_OUT" && latest?.type !== "CHECK_IN") {
    throw new AppError(
      "NOT_CHECKED_IN",
      latest ? `${child.firstName} has already been checked out today.` : `${child.firstName} isn't checked in today.`,
    );
  }

  const event: AttendanceEvent = {
    id: crypto.randomUUID(),
    organizationId: DEMO_ORG_ID,
    childId: child.id,
    guardianId,
    type,
    eventTime: now.toISOString(),
  };
  s.attendance.push(event);
  s.clientAttendance.set(v.clientEventId, event.id);
  return { event, duplicate: false };
}

async function matchStaffByPin(pin: string): Promise<Staff | null> {
  for (const [staffId, hash] of Object.entries(DEMO_STAFF_PIN_HASHES)) {
    if (await bcrypt.compare(pin, hash)) {
      return getDemoStaffAll().find((m) => m.id === staffId) ?? null;
    }
  }
  return null;
}

export async function demoVerifyStaffPin(raw: unknown, now = new Date()): Promise<{ staff: Staff; onDuty: boolean }> {
  ensureSeeded();
  const { pin } = verifyStaffPinSchema.parse(raw);
  const staff = await matchStaffByPin(pin);
  if (!staff || staff.employmentStatus === "TERMINATED") {
    throw new AppError("INVALID_PIN", "PIN not recognised. Please try again.");
  }
  const latest = latestStaffTime(staff.id, dayStartIso(now));
  return { staff: { ...staff, hasPin: true }, onDuty: latest?.type === "CLOCK_IN" };
}

export async function demoRecordStaffTime(
  type: StaffTimeEventType,
  raw: unknown,
  now = new Date(),
): Promise<{ event: StaffTimeEvent; staff: Staff; duplicate: boolean }> {
  ensureSeeded();
  const v = clockInStaffSchema.parse(raw);
  const s = state();

  const existingId = s.clientStaffTime.get(v.clientEventId);
  if (existingId) {
    const event = s.staffTime.find((e) => e.id === existingId);
    const staff = event ? getDemoStaffAll().find((m) => m.id === event.staffId) : undefined;
    if (event && staff) return { event, staff, duplicate: true };
  }

  const staff = await matchStaffByPin(v.pin);
  if (!staff) throw new AppError("INVALID_PIN", "PIN not recognised. Please try again.");
  if (type === "CLOCK_IN" && staff.employmentStatus !== "ACTIVE") {
    throw new AppError("INVALID_TRANSITION", `${staff.firstName} isn't active, so they can't clock in.`);
  }

  const since = dayStartIso(now);
  const latest = latestStaffTime(staff.id, since);
  if (type === "CLOCK_IN" && latest?.type === "CLOCK_IN") {
    throw new AppError("ALREADY_CLOCKED_IN", `${staff.firstName} is already clocked in.`);
  }
  if (type === "CLOCK_OUT" && latest?.type !== "CLOCK_IN") {
    throw new AppError("NOT_CLOCKED_IN", `${staff.firstName} isn't clocked in today.`);
  }

  const event: StaffTimeEvent = {
    id: crypto.randomUUID(),
    organizationId: DEMO_ORG_ID,
    staffId: staff.id,
    type,
    eventTime: now.toISOString(),
  };
  s.staffTime.push(event);
  s.clientStaffTime.set(v.clientEventId, event.id);
  return { event, staff, duplicate: false };
}

export function demoSetChildStatus(childId: string, status: EnrollmentStatus): ChildRecord {
  ensureSeeded();
  const child = getDemoRosterAll().find((c) => c.id === childId);
  if (!child) throw new AppError("NOT_FOUND", "Child not found.");
  state().childStatus.set(childId, status);
  return { ...child, enrollmentStatus: status };
}

export function demoUpdateStaffStatus(
  staffId: string,
  employmentStatus: StaffEmploymentStatus,
  statusNote?: string,
): Staff {
  ensureSeeded();
  const member = getDemoStaffAll().find((m) => m.id === staffId);
  if (!member) throw new AppError("NOT_FOUND", "Staff member not found.");
  state().staffStatus.set(staffId, { employmentStatus, statusNote });
  return { ...member, employmentStatus, statusNote };
}

export const DEMO_ROSTER_READONLY =
  "Demo mode — roster changes aren't saved. Connect D1 later for real edits.";
