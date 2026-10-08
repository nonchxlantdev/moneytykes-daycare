"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthConfigError, authenticate } from "./credentials";
import { clearWelcomePending, createSession, deleteSession, markWelcomePending } from "./session";
import { sessionSecretConfigured } from "./token";

const loginSchema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export interface LoginState {
  error?: string;
  fieldErrors?: { username?: string; password?: string };
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { username: fields.username?.[0], password: fields.password?.[0] } };
  }

  try {
    if (!sessionSecretConfigured()) throw new AuthConfigError();
    const user = await authenticate(parsed.data.username, parsed.data.password);
    if (!user) return { error: "That username or password is incorrect." };
    await createSession(user.id, true, user.username);
    await markWelcomePending();
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error(
        "Sign-in refused: SESSION_SECRET or AUTH_USERS (or AUTH_USERNAME + AUTH_PASSWORD_HASH) is missing or invalid.",
      );
      return { error: "Sign-in is temporarily unavailable. Try again later." };
    }
    console.error("Sign-in failed.");
    return { error: "We couldn't sign you in. Please try again." };
  }

  // Hard navigation so /login remounts with the session + welcome flag.
  // Returning data alone was refreshing past the animation.
  redirect("/login?welcome=1");
}

export async function signOut(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

/** Clears the one-shot welcome flag (call from the welcome screen, not during RSC render). */
export async function dismissWelcomeFlag(): Promise<void> {
  await clearWelcomePending();
}
