import { getD1Binding } from "@/lib/db/d1-binding";

export type DemoModeEnv = {
  DEMO_DATA?: string;
  D1_GATEWAY_URL?: string;
  D1_GATEWAY_SECRET?: string;
};

/**
 * Demo data mode: serve in-repo fixtures instead of Cloudflare D1.
 *
 * Auto-on when there is no native D1 binding and no gateway env.
 * Override with DEMO_DATA=1 (force on) or DEMO_DATA=0 (force off).
 */
export function isDemoDataMode(env: DemoModeEnv = process.env as DemoModeEnv): boolean {
  const flag = env.DEMO_DATA?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;

  if (getD1Binding()) return false;
  const url = env.D1_GATEWAY_URL?.trim();
  const secret = env.D1_GATEWAY_SECRET?.trim();
  return !url || !secret;
}
