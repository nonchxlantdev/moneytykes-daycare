/**
 * ⚠️ DEMO KIOSK VERIFICATION — NOT SECURE, NOT FOR PRODUCTION.
 *
 * In production, PIN checks happen server-side only:
 *   - the kiosk is an authenticated, organization-scoped device
 *   - PINs are stored as salted hashes (argon2/bcrypt), never plaintext
 *   - attempts are rate-limited and audit-logged
 * Nothing here should be reused for real verification.
 */
import type { Staff } from "@/types/domain";

export type PinResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Demo PIN directory for the staff time clock. Shown on-screen as a demo hint. */
export const DEMO_STAFF_PINS: Record<string, string> = {
  "1234": "sarah-wilson",
  "2345": "michael-carter",
  "3456": "jasmine-green",
  "4567": "david-thompson",
  "5678": "maria-lopez",
  "6789": "kevin-brooks",
  "7890": "angela-reyes",
};

export async function mockVerifyStaffPin(pin: string, staff: Staff[]): Promise<PinResult<Staff>> {
  await new Promise((r) => setTimeout(r, 350));
  const staffId = DEMO_STAFF_PINS[pin];
  const member = staff.find((s) => s.id === staffId);
  return member ? { ok: true, value: member } : { ok: false, reason: "PIN not recognised. Please try again." };
}

/** Guardian PIN: any 4 digits succeed in demo mode. */
export async function mockVerifyGuardianPin(pin: string): Promise<PinResult<null>> {
  await new Promise((r) => setTimeout(r, 350));
  return /^\d{4}$/.test(pin) ? { ok: true, value: null } : { ok: false, reason: "Enter all 4 digits." };
}
