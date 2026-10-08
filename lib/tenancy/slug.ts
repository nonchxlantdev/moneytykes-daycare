/**
 * Organization slugs become production hostnames:
 *   <slug>.<PLATFORM_ROOT_DOMAIN>   e.g. mydaycare.visionforgestudio.app
 *
 * So a slug must be a safe DNS label and must not collide with platform
 * subdomains. This is the ONLY place these rules live.
 */

/** Subdomains the platform keeps for itself. Organization slugs can never use them. */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "www",
  "app",
  "api",
  "admin",
  "support",
  "help",
  "status",
  "mail",
  "cdn",
  "assets",
  "static",
  "auth",
  // Additional infrastructure / confusable names.
  "dashboard",
  "login",
  "kiosk",
  "platform",
  "billing",
  "docs",
  "blog",
  "email",
  "smtp",
  "ftp",
  "dev",
  "staging",
  "preview",
  "test",
  "demo",
  "localhost",
  "visionforge",
  "vision-forge",
]);

export const SLUG_MIN_LENGTH = 3;
/** A DNS label is at most 63 characters. */
export const SLUG_MAX_LENGTH = 63;

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isReservedSubdomain(label: string): boolean {
  return RESERVED_SUBDOMAINS.has(label.toLowerCase());
}

/**
 * Suggest a slug from free text ("Sunshine Day Care!" → "sunshine-day-care").
 * The result must still pass validateSlug before it is stored.
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

/** Returns a human-readable problem, or null when the slug is valid. */
export function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN_LENGTH) return `Use at least ${SLUG_MIN_LENGTH} characters.`;
  if (slug.length > SLUG_MAX_LENGTH) return `Use at most ${SLUG_MAX_LENGTH} characters.`;
  if (!SLUG_PATTERN.test(slug)) {
    return "Use lowercase letters, numbers and single hyphens only (no spaces, underscores or symbols, and no hyphen at the start or end).";
  }
  if (slug.includes("--")) return "Don't use two hyphens in a row.";
  if (isReservedSubdomain(slug)) return `"${slug}" is reserved by the platform.`;
  return null;
}

export function isValidSlug(slug: string): boolean {
  return validateSlug(slug) === null;
}
