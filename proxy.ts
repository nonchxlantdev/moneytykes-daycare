import { NextResponse, type NextRequest } from "next/server";
import { BOOTSTRAP_USER_ID, decryptSession, SESSION_COOKIE } from "@/lib/auth/token";
import { platformUrl, resolveTenantFromHostname } from "@/lib/tenancy/hostname";

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/") || pathname === "/api/health";
}

/**
 * Secure by default: every route requires a signed session except the
 * login screen, the health check and files excluded by the matcher.
 * Which daycare a request is for (and whether the user may open it) is
 * decided later, on the server, by lib/auth/tenant.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // www.visionforgestudio.app → visionforgestudio.app (never a daycare).
  const host = request.headers.get("host") ?? "";
  const resolution = resolveTenantFromHostname(host, process.env.PLATFORM_ROOT_DOMAIN);
  if (resolution.kind === "reserved" && resolution.subdomain === "www") {
    const protocol = request.nextUrl.protocol === "http:" ? "http" : "https";
    return NextResponse.redirect(platformUrl(`${pathname}${search}`, { host, protocol, rootDomain: resolution.rootDomain }), 308);
  }

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  const signedIn = session?.userId === BOOTSTRAP_USER_ID;

  if (!signedIn && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
