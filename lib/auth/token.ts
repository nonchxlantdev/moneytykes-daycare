import { jwtVerify, SignJWT } from "jose";

/** Stable id for the env-configured operator. Replaced by a database user id later. */
export const BOOTSTRAP_USER_ID = "usr_bootstrap";

const COOKIE = "vf_session";

export const SESSION_COOKIE = COOKIE;

function signingKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function sessionSecretConfigured(): boolean {
  return signingKey() !== null;
}

export async function encryptSession(userId: string, expiresAt: Date): Promise<string> {
  const key = signingKey();
  if (!key) throw new Error("SESSION_SECRET is not configured");
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key);
}

export async function decryptSession(token: string | undefined): Promise<{ userId: string } | null> {
  const key = signingKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const userId = typeof payload.userId === "string" ? payload.userId : payload.sub;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
