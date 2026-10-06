import { NextResponse, type NextRequest } from "next/server";
import { BOOTSTRAP_USER_ID, decryptSession, SESSION_COOKIE } from "@/lib/auth/token";

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/**
 * Secure by default: every route requires a signed session except the
 * login screen and files excluded by the matcher (Next assets, images).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  const signedIn = session?.userId === BOOTSTRAP_USER_ID;

  if (!signedIn && !isLoginPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (signedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
