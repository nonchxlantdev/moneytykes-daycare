"use client";

import { motion, useReducedMotion } from "motion/react";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { LoginForm } from "./login-form";

export function LoginScreen() {
  const reduceMotion = useReducedMotion();
  const fade = reduceMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <motion.div {...fade} transition={{ duration: 0.3 }} className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          <PlatformLogo />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Enter</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Enter the password to open the daycare dashboard.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
