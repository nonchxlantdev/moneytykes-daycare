"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { signIn, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          Checking
        </>
      ) : (
        "Enter"
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(signIn, initialState);
  const reduceMotion = useReducedMotion();

  return (
    <form action={action} className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {state.error ? (
          <motion.p
            key="form-error"
            role="alert"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm font-medium text-danger"
          >
            {state.error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="sr-only">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          placeholder="Password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className="h-12"
        />
        <span id="password-error">
          <FieldError message={state.fieldErrors?.password} />
        </span>
      </div>

      <SubmitButton />
    </form>
  );
}
