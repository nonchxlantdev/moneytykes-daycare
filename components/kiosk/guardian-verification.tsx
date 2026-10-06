"use client";

import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { GuardianLink } from "@/lib/data";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { mockVerifyGuardianPin } from "@/lib/auth/mock-kiosk-auth";
import { fullName } from "@/lib/utils";
import { NumericKeypad } from "./numeric-keypad";

/**
 * Step: identify the adult at the kiosk by PIN or by choosing their
 * name from the child's authorized list. ⚠️ Demo verification only.
 */
export function GuardianVerification({
  guardians,
  onVerified,
}: {
  guardians: GuardianLink[];
  onVerified: (guardian: GuardianLink) => void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<"pin" | "name">("pin");

  const verify = async (value: string) => {
    setBusy(true);
    setError(undefined);
    const result = await mockVerifyGuardianPin(value);
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      setPin("");
      return;
    }
    // Demo: a valid-looking PIN resolves to the primary guardian.
    onVerified(guardians.find((g) => g.link.isPrimary) ?? guardians[0]);
  };

  return (
    <div className="grid w-full items-start gap-8 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex justify-center">
        <NumericKeypad value={pin} onChange={(v) => { setPin(v); setError(undefined); }} onComplete={verify} busy={busy} error={error} disabled={mode === "name"} />
      </div>

      <div className="hidden h-full flex-col items-center md:flex" aria-hidden="true">
        <span className="w-px flex-1 bg-line" />
        <span className="my-3 text-sm font-bold text-ink-subtle uppercase">or</span>
        <span className="w-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col items-stretch gap-3">
        {mode === "pin" ? (
          <button
            type="button"
            onClick={() => setMode("name")}
            className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-soft transition-transform active:scale-[0.98]"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="size-8" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold text-ink">Search by Name</span>
            <span className="text-ink-muted">Find your name in the list</span>
          </button>
        ) : (
          <>
            <p className="text-lg font-bold text-ink">Who are you?</p>
            <ul className="flex flex-col gap-3">
              {guardians
                .filter((g) => g.link.canPickUp)
                .map((g) => (
                  <li key={g.link.id}>
                    <button
                      type="button"
                      onClick={() => onVerified(g)}
                      className="flex h-20 w-full items-center gap-4 rounded-2xl border border-line bg-surface px-4 text-left shadow-soft transition-transform active:scale-[0.98]"
                    >
                      <PersonAvatar name={fullName(g.guardian)} size="lg" />
                      <span className="flex-1">
                        <span className="block text-lg font-bold text-ink">{fullName(g.guardian)}</span>
                        <span className="block text-ink-muted">{g.link.relationship}</span>
                      </span>
                      <ChevronRight className="size-6 text-ink-subtle" aria-hidden="true" />
                    </button>
                  </li>
                ))}
            </ul>
            <button type="button" onClick={() => setMode("pin")} className="mt-1 self-start rounded-lg px-2 py-2 font-semibold text-primary">
              Use PIN instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
