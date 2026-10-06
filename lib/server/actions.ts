"use server";

/**
 * Server actions — the only mutation entry points for the UI.
 * Inputs are typed `unknown` on purpose: every payload is validated by
 * Zod inside the service, and the tenant comes from the session.
 *
 * Kiosk note: the kiosk runs inside the operator's signed-in session for
 * now. Phase 3 adds device authentication and route handlers for
 * offline sync that call these SAME services.
 */
import { runAction, runQuery } from "./action-runner";
import { recordAttendance } from "./services/attendance";
import { createChild, setChildStatus, updateChild } from "./services/children";
import { createGuardian, linkGuardian, searchGuardians, unlinkGuardian, updateGuardian, updateGuardianLink } from "./services/guardians";
import { updateBranding, updateOrganizationSettings } from "./services/organization";
import { createStaff, updateStaff } from "./services/staff";
import { recordStaffTime, verifyStaffPin } from "./services/staff-time";

/* children */
export async function createChildAction(input: unknown) {
  return runAction((db, ctx) => createChild(db, ctx, input));
}
export async function updateChildAction(input: unknown) {
  return runAction((db, ctx) => updateChild(db, ctx, input));
}
export async function setChildStatusAction(input: unknown) {
  return runAction((db, ctx) => setChildStatus(db, ctx, input));
}

/* guardians */
export async function createGuardianAction(input: unknown) {
  return runAction((db, ctx) => createGuardian(db, ctx, input));
}
export async function updateGuardianAction(input: unknown) {
  return runAction((db, ctx) => updateGuardian(db, ctx, input));
}
export async function linkGuardianAction(input: unknown) {
  return runAction((db, ctx) => linkGuardian(db, ctx, input));
}
export async function updateGuardianLinkAction(input: unknown) {
  return runAction((db, ctx) => updateGuardianLink(db, ctx, input));
}
export async function unlinkGuardianAction(input: unknown) {
  return runAction((db, ctx) => unlinkGuardian(db, ctx, input));
}
export async function searchGuardiansAction(query: unknown) {
  return runQuery((db, ctx) => searchGuardians(db, ctx, typeof query === "string" ? query : ""));
}

/* attendance */
export async function checkInChildAction(input: unknown) {
  return runAction((db, ctx) => recordAttendance(db, ctx, "CHECK_IN", input));
}
export async function checkOutChildAction(input: unknown) {
  return runAction((db, ctx) => recordAttendance(db, ctx, "CHECK_OUT", input));
}

/* staff */
export async function createStaffAction(input: unknown) {
  return runAction((db, ctx) => createStaff(db, ctx, input));
}
export async function updateStaffAction(input: unknown) {
  return runAction((db, ctx) => updateStaff(db, ctx, input));
}
export async function verifyStaffPinAction(input: unknown) {
  return runQuery((db, ctx) => verifyStaffPin(db, ctx, input));
}
export async function clockInStaffAction(input: unknown) {
  return runAction((db, ctx) => recordStaffTime(db, ctx, "CLOCK_IN", input));
}
export async function clockOutStaffAction(input: unknown) {
  return runAction((db, ctx) => recordStaffTime(db, ctx, "CLOCK_OUT", input));
}

/* organization */
export async function updateOrganizationAction(input: unknown) {
  return runAction((db, ctx) => updateOrganizationSettings(db, ctx, input));
}
export async function updateBrandingAction(input: unknown) {
  return runAction((db, ctx) => updateBranding(db, ctx, input));
}
