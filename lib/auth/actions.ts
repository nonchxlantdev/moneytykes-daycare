"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthConfigError, authenticate } from "./credentials";
import { createSession, deleteSession } from "./session";
import { sessionSecretConfigured } from "./token";

const loginSchema = z.object({
  password: z.string().min(1, "Enter the password"),
});

export interface LoginState {
  error?: string;
  fieldErrors?: { password?: string };
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: { password: parsed.error.flatten().fieldErrors.password?.[0] } };
  }

  try {
    if (!sessionSecretConfigured()) throw new AuthConfigError();
    const user = await authenticate(parsed.data.password);
    if (!user) return { error: "That password is incorrect." };
    await createSession(user.id, true);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("Sign-in refused: SESSION_SECRET or AUTH_PASSWORD_HASH is missing or invalid.");
      return { error: "Sign-in is temporarily unavailable. Try again later." };
    }
    console.error("Sign-in failed.");
    return { error: "We couldn't sign you in. Please try again." };
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
