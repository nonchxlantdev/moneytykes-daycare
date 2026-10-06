/**
 * ⚠️ DEMO DEVICE IDENTITY.
 * Production kiosks authenticate as a registered device (devices table)
 * and the server derives deviceId + organizationId from that session —
 * the client never asserts them.
 */
export const DEMO_KIOSK_DEVICE_ID = "dev_front_desk_ipad";

export function newEventId(): string {
  return crypto.randomUUID();
}
