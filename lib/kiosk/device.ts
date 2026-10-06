/**
 * Kiosk client helpers.
 *
 * Every attendance / time-clock submission carries a client-generated
 * UUID (`clientEventId`). The same id is reused if the request is retried,
 * so the server can safely de-duplicate — the foundation for offline sync.
 *
 * Device identity: Phase 2 kiosks run inside the operator's signed-in
 * session and events are stored with device_id = NULL. Phase 3 adds
 * registered, authenticated kiosk devices; the server will derive the
 * device id from that session (never from the client).
 */
export function newClientEventId(): string {
  return crypto.randomUUID();
}
