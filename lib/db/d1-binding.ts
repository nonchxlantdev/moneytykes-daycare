import type { D1DatabaseLike } from "./d1-executor";

/**
 * Native D1 binding lookup — DEFAULT implementation (Next.js on Vercel,
 * `next dev`, Vitest): there is no binding, so the app uses the D1 gateway.
 *
 * When the app is built for Cloudflare Workers (`npm run build:vinext`),
 * vite.config.ts swaps this module for ./d1-binding.workers.ts, which reads
 * the `DB` binding declared in wrangler.jsonc.
 */
export function getD1Binding(): D1DatabaseLike | null {
  return null;
}
