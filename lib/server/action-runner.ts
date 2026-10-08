import "server-only";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/tenant";
import { getDb } from "@/lib/db";
import type { AppDb } from "@/lib/db/client";
import { isDemoDataMode } from "@/lib/demo-data/mode";
import { AppError, toSafeError, type ActionResult } from "./errors";
import type { TenantContext } from "./tenant-context";

const DEMO_READONLY = "Demo mode — this change isn't saved. Connect a database later for real edits.";

/**
 * Shared wrapper for server actions:
 *   authenticate → resolve tenant (from session, never from input) → run
 *   service (validates + authorizes) → revalidate → user-safe result.
 *
 * Revalidating the root layout refreshes the tenant layout's event window
 * and every page, so dashboards never show stale attendance after a write.
 */
export async function runAction<T>(fn: (db: AppDb, ctx: TenantContext) => Promise<T>): Promise<ActionResult<T>> {
  try {
    if (isDemoDataMode()) {
      throw new AppError("VALIDATION", DEMO_READONLY);
    }
    const ctx = await getActionContext();
    const data = await fn(getDb(), ctx);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toSafeError(error) };
  }
}

/** Read-only variant (no revalidation). */
export async function runQuery<T>(fn: (db: AppDb, ctx: TenantContext) => Promise<T>): Promise<ActionResult<T>> {
  try {
    if (isDemoDataMode()) {
      throw new AppError("VALIDATION", DEMO_READONLY);
    }
    const ctx = await getActionContext();
    return { ok: true, data: await fn(getDb(), ctx) };
  } catch (error) {
    return { ok: false, error: toSafeError(error) };
  }
}

/** Demo-mode mutations that are allowed (check-in, clock, soft status). */
export async function runDemoAction<T>(fn: (ctx: TenantContext) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const ctx = await getActionContext();
    const data = await fn(ctx);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toSafeError(error) };
  }
}
