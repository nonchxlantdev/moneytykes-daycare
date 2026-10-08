"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { consumePostLoginEntrance } from "@/components/auth/login-welcome-overlay";

/** Soft settle-in when arriving from the login welcome animation. */
export function DashboardReveal({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [fromLogin, setFromLogin] = useState(false);

  useEffect(() => {
    setFromLogin(consumePostLoginEntrance());
  }, []);

  if (reduceMotion || !fromLogin) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
