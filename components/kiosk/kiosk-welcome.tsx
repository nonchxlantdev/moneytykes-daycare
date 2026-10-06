"use client";

import { motion, useReducedMotion } from "motion/react";
import { useOrganization } from "@/components/shared/organization-provider";

export function KioskWelcome() {
  const org = useOrganization();
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <h1 className="text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">{org.kioskWelcomeMessage}</h1>
      <p className="mt-3 text-xl font-medium text-ink-muted sm:text-2xl">What would you like to do?</p>
    </motion.div>
  );
}
