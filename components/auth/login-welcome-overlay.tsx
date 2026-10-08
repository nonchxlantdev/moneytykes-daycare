"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const POST_LOGIN_KEY = "vf_post_login";

export function markPostLoginEntrance(): void {
  try {
    sessionStorage.setItem(POST_LOGIN_KEY, "1");
  } catch {
    /* private mode — entrance animation is optional */
  }
}

export function consumePostLoginEntrance(): boolean {
  try {
    if (sessionStorage.getItem(POST_LOGIN_KEY) !== "1") return false;
    sessionStorage.removeItem(POST_LOGIN_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Star + smile mark used in the post-login welcome (matches Little Stars logo energy). */
function WelcomeStar({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 64 64" className="size-full" role="img" aria-label="Welcome">
      <defs>
        <linearGradient id="welcome-star-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd23f" />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
      </defs>
      <motion.g
        initial={{ scale: 0.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16, mass: 0.7 }}
        style={{ transformOrigin: "32px 32px" }}
      >
        <path
          d="M32 4 L39.6 21.6 L58.6 23.2 L44.2 35.8 L48.6 54.4 L32 44.6 L15.4 54.4 L19.8 35.8 L5.4 23.2 L24.4 21.6 Z"
          fill="url(#welcome-star-fill)"
        />
      </motion.g>
      <motion.g
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 380, damping: 18 }}
        style={{ transformOrigin: "32px 31px" }}
      >
        <circle cx="32" cy="31" r="7.5" fill="#fff" />
        <circle cx="29.5" cy="28.6" r="1.15" fill="#0f1b3d" />
        <circle cx="34.5" cy="28.6" r="1.15" fill="#0f1b3d" />
        <motion.path
          d="M28.6 31.8 Q32 35.2 35.4 31.8"
          stroke="#0f1b3d"
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.4, ease: "easeOut" }}
        />
      </motion.g>
    </svg>
  );
}

export function LoginWelcomeOverlay({
  open,
  daycareName,
  accentColor,
  onFinished,
}: {
  open: boolean;
  daycareName: string;
  accentColor: string;
  onFinished: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const ms = reduceMotion ? 700 : 2200;
    const id = window.setTimeout(onFinished, ms);
    return () => window.clearTimeout(id);
  }, [open, onFinished, reduceMotion]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="login-welcome"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
          style={{
            background: `radial-gradient(circle at 50% 42%, color-mix(in oklab, ${accentColor} 28%, white), var(--color-canvas, #f5f7fc) 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.35 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-5 text-center">
            <motion.div
              className="size-36 sm:size-40"
              initial={reduceMotion ? false : { y: 22, scale: 0.45 }}
              animate={{ y: 0, scale: 1 }}
              transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 14 }}
            >
              {reduceMotion ? (
                <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="welcome-star-static" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#ffd23f" />
                      <stop offset="1" stopColor={accentColor} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M32 4 L39.6 21.6 L58.6 23.2 L44.2 35.8 L48.6 54.4 L32 44.6 L15.4 54.4 L19.8 35.8 L5.4 23.2 L24.4 21.6 Z"
                    fill="url(#welcome-star-static)"
                  />
                  <circle cx="32" cy="31" r="7.5" fill="#fff" />
                  <circle cx="29.5" cy="28.6" r="1.15" fill="#0f1b3d" />
                  <circle cx="34.5" cy="28.6" r="1.15" fill="#0f1b3d" />
                  <path d="M28.6 31.8 Q32 35.2 35.4 31.8" stroke="#0f1b3d" strokeWidth="1.9" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                <WelcomeStar accent={accentColor} />
              )}
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.35, duration: 0.4 }}
            >
              <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">Welcome to</p>
              <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{daycareName}</p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
