import { ZodError } from "zod";
import { findDatabaseError } from "@/lib/db/executor";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "ALREADY_CHECKED_IN"
  | "ALREADY_CHECKED_OUT"
  | "NOT_CHECKED_IN"
  | "ALREADY_CLOCKED_IN"
  | "NOT_CLOCKED_IN"
  | "INVALID_TRANSITION"
  | "INVALID_PIN"
  | "CONFLICT"
  | "DB_UNAVAILABLE"
  | "INTERNAL";

/**
 * An error whose `message` is safe to show to the user. Anything that is
 * not an AppError is treated as internal and replaced with a generic
 * message before leaving the server (no SQL, credentials or stack traces).
 */
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Please sign in to continue.");
export const forbidden = (message = "You don't have permission to do that.") => new AppError("FORBIDDEN", message);
export const notFound = (entity: string) => new AppError("NOT_FOUND", `${entity} not found.`);

export interface SafeError {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: SafeError };

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

/** Convert any thrown value into a user-safe error. Internal details are logged server-side only. */
export function toSafeError(error: unknown): SafeError {
  if (error instanceof AppError) return { code: error.code, message: error.message, fieldErrors: error.fieldErrors };
  if (error instanceof ZodError) {
    return { code: "VALIDATION", message: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(error) };
  }
  const dbError = findDatabaseError(error);
  if (dbError?.kind === "UNAVAILABLE") {
    console.error("[db] unavailable:", dbError.message);
    return { code: "DB_UNAVAILABLE", message: "The database is temporarily unavailable. Please try again in a moment." };
  }
  console.error("[server] unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : error);
  return { code: "INTERNAL", message: "Something went wrong. Please try again." };
}
