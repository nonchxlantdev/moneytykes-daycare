/**
 * ⚠️ SIMPLIFIED GUARDIAN CHECK — NOT REAL VERIFICATION (Phase 2).
 *
 * Staff time-clock PINs ARE real in Phase 2: they are bcrypt-hashed in D1 and
 * verified server-side (lib/server/services/staff-time.ts).
 *
 * Guardian PINs are NOT yet verified. Any 4 digits pass, and the kiosk labels
 * this honestly on screen. The guardian chosen here is still recorded on the
 * attendance event (and validated server-side as linked to the child, and as an
 * authorized pickup for check-out).
 *
 * Phase 3: guardians.pin_hash (column already exists) + server-side verification
 * with rate limiting and audit logging. Delete this file then.
 */

export type PinResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Guardian PIN: any 4 digits succeed (simplified — see header). */
export async function mockVerifyGuardianPin(pin: string): Promise<PinResult<null>> {
  await new Promise((r) => setTimeout(r, 250));
  return /^\d{4}$/.test(pin) ? { ok: true, value: null } : { ok: false, reason: "Enter all 4 digits." };
}
