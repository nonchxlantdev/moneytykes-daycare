/**
 * SIGNATURE STORAGE — Phase 3 seam (Cloudflare R2). NOT ACTIVE IN PHASE 2.
 *
 * Phase 2 behaviour: the kiosk requires a signature on screen, but the image
 * is discarded after the event is saved and `attendance_events.signature_object_key`
 * stays NULL. Signature images are never stored in D1, localStorage or anywhere else.
 *
 * Phase 3 plan:
 *   1. Kiosk (authenticated device) POSTs the PNG blob to a route handler.
 *   2. Server validates size/type and writes to a PRIVATE R2 bucket at
 *      orgs/{organizationId}/signatures/{yyyy-mm-dd}/{eventId}.png
 *   3. Only the object key is stored on the attendance event.
 *   4. Admins view signatures through short-lived signed URLs.
 */
export const SIGNATURE_STORAGE_ENABLED = false;

export const MAX_SIGNATURE_BYTES = 512 * 1024;

/** Client-side sanity check that a signature was actually drawn before submitting. */
export function isUsableSignature(blob: Blob | null): blob is Blob {
  return Boolean(blob && blob.type === "image/png" && blob.size > 0 && blob.size <= MAX_SIGNATURE_BYTES);
}
