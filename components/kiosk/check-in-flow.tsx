"use client";

import { useCallback, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { ArrowRight, Check, House, LoaderCircle, LogOut, RotateCcw } from "lucide-react";
import type { ChildRecord, Classroom, GuardianLink } from "@/types/domain";
import { useOrganization } from "@/components/shared/organization-provider";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { newClientEventId } from "@/lib/kiosk/device";
import { checkInChildAction } from "@/lib/server/actions";
import { isUsableSignature } from "@/lib/services/signature-storage";
import { formatCalendarDate, formatTime, fullName } from "@/lib/utils";
import { ChildSummaryCard } from "./child-summary-card";
import { GuardianVerification } from "./guardian-verification";
import { KioskChildPicker } from "./kiosk-child-picker";
import { KioskBackButton, KioskButton, KioskStep, KioskTitle } from "./kiosk-screen";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { SuccessConfirmation } from "./success-confirmation";

/* ---------------- state machine ---------------- */

type State =
  | { step: "select" }
  | { step: "confirm"; childId: string }
  | { step: "verify"; childId: string }
  | { step: "sign"; childId: string; guardianId: string }
  | { step: "done"; childId: string; eventTime: string };

type Action =
  | { type: "SELECT"; childId: string }
  | { type: "CONFIRM" }
  | { type: "VERIFIED"; guardianId: string }
  | { type: "SIGNED"; eventTime: string }
  | { type: "BACK" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SELECT":
      return { step: "confirm", childId: action.childId };
    case "CONFIRM":
      return state.step === "confirm" ? { step: "verify", childId: state.childId } : state;
    case "VERIFIED":
      return state.step === "verify" ? { step: "sign", childId: state.childId, guardianId: action.guardianId } : state;
    case "SIGNED":
      return state.step === "sign" ? { step: "done", childId: state.childId, eventTime: action.eventTime } : state;
    case "BACK":
      if (state.step === "confirm") return { step: "select" };
      if (state.step === "verify") return { step: "confirm", childId: state.childId };
      if (state.step === "sign") return { step: "verify", childId: state.childId };
      return state;
    case "RESET":
      return { step: "select" };
  }
}

/* ---------------- component ---------------- */

export function CheckInFlow({
  roster,
  classrooms,
  initialChildId,
}: {
  roster: ChildRecord[];
  classrooms: Classroom[];
  initialChildId?: string;
}) {
  const org = useOrganization();
  const router = useRouter();
  const clientEventId = useRef<string | null>(null);
  const { byChild } = useChildDays(roster);
  const [state, dispatch] = useReducer(
    reducer,
    initialChildId && roster.some((c) => c.id === initialChildId)
      ? ({ step: "confirm", childId: initialChildId } as State)
      : ({ step: "select" } as State),
  );
  const padRef = useRef<SignaturePadHandle>(null);
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const child = "childId" in state ? roster.find((c) => c.id === state.childId) : undefined;
  const classroomName = (id: string) => classrooms.find((c) => c.id === id)?.name ?? id;
  const goHome = useCallback(() => router.push("/kiosk"), [router]);

  const submit = async (guardianId: string) => {
    if (!child || !padRef.current) return;
    setSubmitting(true);
    setError(undefined);
    try {
      if (!isUsableSignature(await padRef.current.toBlob())) {
        setError("Please sign before confirming.");
        return;
      }
      // Reused if this submission is retried, so the server can de-duplicate.
      clientEventId.current ??= newClientEventId();
      const result = await checkInChildAction({ childId: child.id, guardianId, clientEventId: clientEventId.current });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      // Success screen only after the server confirmed persistence.
      clientEventId.current = null;
      setHasInk(false);
      router.refresh();
      dispatch({ type: "SIGNED", eventTime: result.data.event.eventTime });
    } catch {
      setError("We couldn't reach the server. Check the connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.step === "select" && (
        <KioskStep key="select">
          <KioskTitle title="Select a Child" subtitle="Tap your child's name to check them in." />
          <KioskChildPicker
            roster={roster}
            classrooms={classrooms}
            byChild={byChild}
            filters={[
              { id: "waiting", label: "Not here yet", match: (_c, d) => d?.status !== "IN" },
              { id: "all", label: "All children", match: () => true },
              { id: "class", label: "By class", match: () => true, byClass: true },
            ]}
            caption={(d) =>
              d?.status === "IN" && d.checkIn
                ? `In since ${formatTime(d.checkIn.eventTime, org.timezone)}`
                : d?.status === "OUT" && d.checkOut
                  ? `Picked up ${formatTime(d.checkOut.eventTime, org.timezone)}`
                  : undefined
            }
            onSelect={(c) => dispatch({ type: "SELECT", childId: c.id })}
          />
          <div className="mt-8">
            <KioskBackButton onClick={goHome} label="Home" />
          </div>
        </KioskStep>
      )}

      {state.step === "confirm" && child && (
        <KioskStep key="confirm" className="items-center justify-center">
          <div className="w-full max-w-3xl">
            <ChildSummaryCard
              name={fullName(child)}
              photoUrl={child.photoUrl}
              rows={[
                { label: "Date of Birth", value: formatCalendarDate(child.dateOfBirth) },
                { label: "Class", value: child.classroomId ? classroomName(child.classroomId) : "—" },
                {
                  label: "Authorized Pickup",
                  value: `${child.guardians.filter((g) => g.link.canPickUp).length} Guardians`,
                },
              ]}
            />
            {byChild.get(child.id)?.status === "IN" ? (
              <div className="mt-6 rounded-3xl border border-warning/40 bg-warning/10 p-6 text-center">
                <p className="text-xl font-bold text-ink">{child.firstName} is already checked in today.</p>
                <p className="mt-1 text-ink-muted">
                  Arrived at {formatTime(byChild.get(child.id)!.checkIn!.eventTime, org.timezone)}. Picking up instead?
                </p>
                <Link
                  href={`/kiosk/check-out?child=${child.id}`}
                  className="mt-5 inline-flex h-16 items-center gap-3 rounded-2xl bg-primary px-8 text-xl font-bold text-primary-foreground shadow-soft"
                >
                  <LogOut className="size-6" aria-hidden="true" /> Go to Check Out
                </Link>
              </div>
            ) : (
              <KioskButton tone="success" className="mt-6 h-24 w-full text-2xl sm:text-3xl" onClick={() => dispatch({ type: "CONFIRM" })}>
                <span className="flex size-12 items-center justify-center rounded-full bg-white/25">
                  <Check className="!size-8" aria-hidden="true" />
                </span>
                CHECK IN
              </KioskButton>
            )}
            <div className="mt-6">
              <KioskBackButton onClick={() => dispatch({ type: "BACK" })} />
            </div>
          </div>
        </KioskStep>
      )}

      {state.step === "verify" && child && (
        <KioskStep key="verify">
          <KioskTitle title="Guardian Verification" subtitle="Enter your 4-digit PIN or search for your name." />
          <GuardianVerification
            guardians={child.guardians}
            onVerified={(g: GuardianLink) => dispatch({ type: "VERIFIED", guardianId: g.guardian.id })}
          />
          <p className="mt-6 text-center text-sm text-ink-subtle">Simplified check: guardian PINs are not verified yet — any 4 digits are accepted.</p>
          <div className="mt-6">
            <KioskBackButton onClick={() => dispatch({ type: "BACK" })} />
          </div>
        </KioskStep>
      )}

      {state.step === "sign" && child && (
        <KioskStep key="sign">
          <KioskTitle
            title="Parent / Guardian Signature"
            subtitle={
              <>
                Please sign below to confirm check in for <strong className="text-ink">{fullName(child)}</strong>.
              </>
            }
          />
          <p className="-mt-4 mb-5 text-center text-ink-muted">
            Signing as{" "}
            <strong className="text-ink">
              {(() => {
                const g = child.guardians.find((x) => x.guardian.id === state.guardianId);
                return g ? `${fullName(g.guardian)} (${g.link.relationship})` : "Guardian";
              })()}
            </strong>
          </p>
          <SignaturePad ref={padRef} onInkChange={setHasInk} className="h-72 w-full sm:h-80" label={`Signature for ${fullName(child)} check in`} />
          {error && (
            <p role="alert" className="mt-3 text-center font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <KioskBackButton onClick={() => dispatch({ type: "BACK" })} />
            <KioskButton tone="primary" disabled={!hasInk || submitting} onClick={() => submit(state.guardianId)}>
              {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              Confirm Check In
              {!submitting && <ArrowRight aria-hidden="true" />}
            </KioskButton>
          </div>
        </KioskStep>
      )}

      {state.step === "done" && child && (
        <KioskStep key="done" className="items-center justify-center">
          <SuccessConfirmation
            title={fullName(child)}
            headline="Checked In!"
            detail={`Today at ${formatTime(state.eventTime, org.timezone)}`}
            message="Have a wonderful day! 🎉"
            autoResetSeconds={30}
            onTimeout={goHome}
            actions={
              <>
                <KioskButton tone="outline" className="flex-1" onClick={() => dispatch({ type: "RESET" })}>
                  <RotateCcw aria-hidden="true" /> Check In Another Child
                </KioskButton>
                <KioskButton tone="primary" className="flex-1" onClick={goHome}>
                  <House aria-hidden="true" /> Return to Home
                </KioskButton>
              </>
            }
          />
        </KioskStep>
      )}
    </AnimatePresence>
  );
}
