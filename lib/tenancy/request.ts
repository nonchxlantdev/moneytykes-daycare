import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { resolveTenantFromHostname, type HostResolution } from "./hostname";

export interface RequestTenancy {
  /** Host header as received (may include a port locally). */
  host: string;
  protocol: "http" | "https";
  resolution: HostResolution;
}

/**
 * Tenancy for the current request, from the Host header.
 *
 * Only the real Host header is used — never X-Forwarded-Host, which a client
 * could set itself. On Cloudflare the Host is the hostname the edge routed.
 */
export const getRequestTenancy = cache(async (): Promise<RequestTenancy> => {
  const h = await headers();
  const host = h.get("host") ?? "";
  const resolution = resolveTenantFromHostname(host, process.env.PLATFORM_ROOT_DOMAIN);
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isLocal = /(^|\.)localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
  const protocol = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  return { host, protocol, resolution };
});
