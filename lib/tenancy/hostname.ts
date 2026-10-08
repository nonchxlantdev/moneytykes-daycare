import { isReservedSubdomain, isValidSlug } from "./slug";

/**
 * Centralized hostname → tenant resolution. Nothing else in the app parses
 * hostnames.
 *
 *   visionforgestudio.app               → platform (NOT a daycare)
 *   mydaycare.visionforgestudio.app     → tenant "mydaycare"
 *   www.visionforgestudio.app           → reserved
 *   a.b.visionforgestudio.app           → invalid
 *   mydaycare.localhost / localhost     → same rules, for local development
 *   *.workers.dev, *.vercel.app, …      → unscoped (pre-cutover test URLs;
 *                                          the daycare comes from the user's
 *                                          membership — see docs/TENANCY.md)
 *
 * IMPORTANT: this only says WHICH organization is being requested. It never
 * authorizes anything — membership is checked in lib/server/tenant-context.ts.
 */
export type HostResolution =
  | { kind: "platform"; rootDomain: string }
  | { kind: "tenant"; slug: string; rootDomain: string }
  | { kind: "reserved"; subdomain: string; rootDomain: string }
  | { kind: "invalid"; rootDomain: string }
  | { kind: "unscoped" };

/** Local development root: mydaycare.localhost:3001 → tenant "mydaycare". */
export const LOCAL_ROOT_DOMAIN = "localhost";

/** Lowercase, strip port and a trailing dot. Returns "" for unusable input. */
export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  let h = host.trim().toLowerCase();
  if (h.startsWith("[")) return ""; // IPv6 literal — never a tenant
  const colon = h.lastIndexOf(":");
  if (colon !== -1) h = h.slice(0, colon);
  return h.replace(/\.$/, "");
}

export function resolveTenantFromHostname(host: string | null | undefined, platformRootDomain: string | undefined): HostResolution {
  const hostname = normalizeHostname(host);
  if (!hostname) return { kind: "unscoped" };

  const roots = [platformRootDomain ? normalizeHostname(platformRootDomain) : "", LOCAL_ROOT_DOMAIN].filter(Boolean);
  for (const rootDomain of roots) {
    if (hostname === rootDomain) return { kind: "platform", rootDomain };
    if (!hostname.endsWith(`.${rootDomain}`)) continue;

    const label = hostname.slice(0, -(rootDomain.length + 1));
    if (label.includes(".")) return { kind: "invalid", rootDomain };
    if (isReservedSubdomain(label)) return { kind: "reserved", subdomain: label, rootDomain };
    if (!isValidSlug(label)) return { kind: "invalid", rootDomain };
    return { kind: "tenant", slug: label, rootDomain };
  }
  return { kind: "unscoped" };
}

/**
 * Absolute URL for a daycare on the same root domain the request came in on,
 * keeping the scheme and port (so mydaycare.localhost:3001 works locally).
 */
export function tenantUrl(slug: string, path: string, current: { host: string; protocol: "http" | "https"; rootDomain: string }): string {
  const port = current.host.includes(":") && !current.host.startsWith("[") ? current.host.slice(current.host.lastIndexOf(":")) : "";
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `${current.protocol}://${slug}.${current.rootDomain}${port}${safePath}`;
}

export function platformUrl(path: string, current: { host: string; protocol: "http" | "https"; rootDomain: string }): string {
  const port = current.host.includes(":") && !current.host.startsWith("[") ? current.host.slice(current.host.lastIndexOf(":")) : "";
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `${current.protocol}://${current.rootDomain}${port}${safePath}`;
}

/**
 * Parent-domain cookie scope. Returns the Domain attribute to use, or
 * undefined for a host-only cookie (localhost, workers.dev, vercel.app…).
 */
export function cookieDomainFor(host: string | null | undefined, configuredDomain: string | undefined): string | undefined {
  const hostname = normalizeHostname(host);
  const domain = configuredDomain ? normalizeHostname(configuredDomain) : "";
  if (!hostname || !domain || domain === LOCAL_ROOT_DOMAIN) return undefined;
  return hostname === domain || hostname.endsWith(`.${domain}`) ? domain : undefined;
}
