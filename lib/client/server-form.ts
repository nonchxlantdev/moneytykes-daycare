"use client";

/**
 * Helpers for submitting react-hook-form forms through server actions.
 *
 * Client-side Zod validation is a UX convenience only; the server re-validates
 * everything. Field errors returned by the server are mapped back onto the form,
 * anything else becomes a form-level message.
 */
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/lib/server/errors";

export const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

export function applyServerErrors<T extends FieldValues>(
  result: Extract<ActionResult<unknown>, { ok: false }>,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | undefined {
  const fieldErrors = result.error.fieldErrors ?? {};
  let unmatched = false;
  for (const [key, message] of Object.entries(fieldErrors)) {
    if (fields.includes(key)) setError(key as Path<T>, { type: "server", message });
    else unmatched = true;
  }
  // Show the general message when nothing could be attached to a visible field.
  return Object.keys(fieldErrors).length === 0 || unmatched ? result.error.message : undefined;
}

/** Run a server action, converting a thrown network failure into a safe result. */
export async function callAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch {
    return { ok: false, error: { code: "INTERNAL", message: NETWORK_ERROR_MESSAGE } };
  }
}
