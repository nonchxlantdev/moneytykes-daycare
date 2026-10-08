"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dismissWelcomeFlag } from "@/lib/auth/actions";
import { LoginWelcomeOverlay, markPostLoginEntrance } from "./login-welcome-overlay";

/**
 * Shown on /login after a successful sign-in. Next refreshes the RSC tree once
 * the session cookie exists; an immediate redirect would kill the client
 * animation, so this page owns the welcome beat and then navigates.
 */
export function PostLoginWelcome({
  daycareName,
  accentColor,
}: {
  daycareName: string;
  accentColor: string;
}) {
  const router = useRouter();

  useEffect(() => {
    void dismissWelcomeFlag();
  }, []);

  const finish = useCallback(() => {
    markPostLoginEntrance();
    // Drop ?welcome=1 so a refresh doesn't replay the intro.
    router.replace("/dashboard");
    router.refresh();
  }, [router]);

  return (
    <main className="min-h-dvh bg-canvas">
      <LoginWelcomeOverlay open daycareName={daycareName} accentColor={accentColor} onFinished={finish} />
    </main>
  );
}
