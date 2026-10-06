/**
 * SIGNATURE STORAGE SERVICE (mock).
 *
 * Phase 1: validates that a signature image exists and returns a
 * would-be private object key. The image bytes are discarded — they are
 * never written to localStorage, IndexedDB or any public location.
 *
 * Phase 2 (Cloudflare R2):
 *   1. Kiosk POSTs the PNG blob to a server route authenticated as the
 *      kiosk device for this organization.
 *   2. Server validates size/type, writes to a PRIVATE bucket at
 *      orgs/{organizationId}/signatures/{yyyy-mm-dd}/{eventId}.png
 *   3. Server stores only the object key on the attendance event.
 *   4. Admins view signatures through short-lived signed URLs.
 */
export interface UploadSignatureInput {
  organizationId: string;
  eventId: string;
  date: string; // YYYY-MM-DD
  blob: Blob;
}

const MAX_SIGNATURE_BYTES = 512 * 1024;

export async function uploadSignature({ organizationId, eventId, date, blob }: UploadSignatureInput): Promise<string> {
  if (blob.type !== "image/png") throw new Error("Signature must be a PNG image");
  if (blob.size === 0 || blob.size > MAX_SIGNATURE_BYTES) throw new Error("Signature image is empty or too large");
  await new Promise((r) => setTimeout(r, 400)); // simulate network
  return `orgs/${organizationId}/signatures/${date}/${eventId}.png`;
}
