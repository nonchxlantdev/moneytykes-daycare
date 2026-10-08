/**
 * Minimal declaration for the Workers runtime module used by
 * lib/db/d1-binding.workers.ts (only bundled into the Cloudflare build).
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
