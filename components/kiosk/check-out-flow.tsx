"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { ArrowRight, House, LogIn, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import type { Classroom } from "@/types/domain";
import type { ChildRecord } from "@/lib/data";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { DEMO_KIOSK_DEVICE_ID, newEventId } from "@/lib/kiosk/device";
import { uploadSignature } from "@/lib/services/signature-storage";
import { useDemoStore } from "@/lib/store/demo-store";
import { dateKey, formatDuration, formatTime, fullName } from "@/lib/utils";
import { KioskChildPicker } from "./kiosk-child-picker";
import { KioskBackButton, KioskButton, KioskStep, KioskTitle } from "./kiosk-screen";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { SuccessConfirmation } from "./success-confirmation";

type State =
  | { step: "select" }
  | { step: "confirm"; childId: string }
  | { step: "done"; childId: string; eventTime: string; durationMs?: number };

export function CheckOutFlow({
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
  const { recordAttendanceEvent } = useDemoStore();
  const { byChild, hasClock } = useChildDays(roster);
  const [state, setState] = useState<State>(() =>
    initialChildId && roster.some((c) => c.id === initialChildId) ? { step: "confirm", childId: initialChildId } : { step: "select" },
  );
  const primaryPickupOf = (c?: ChildRecord) =>
    c ? (c.guardians.find((g) => g.link.canPickUp && g.link.isPrimary) ?? c.guardians.find((g) => g.link.canPickUp))?.guardian.id ?? "" : "";
  const [guardianId, setGuardianId] = useState<string>(() => primaryPickupOf(roster.find((c) => c.id === initialChildId)));
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const padRef = useRef<SignaturePadHandle>(null);

  const child = state.step !== "select" ? roster.find((c) => c.id === state.childId) : undefined;
  const day = child ? byChild.get(child.id) : undefined;
  const pickups = child?.guardians.filter((g) => g.link.canPickUp) ?? [];
  const goHome = useCallback(() => router.push("/kiosk"), [router]);

  const select = (c: ChildRecord) => {
    setGuardianId(primaryPickupOf(c));
    setHasInk(false);
    setError(undefined);
    setState({ step: "confirm", childId: c.id });
  };

  const submit = async () => {
    if (!child || !padRef.current) return;
    if (!guardianId) return setError("Please choose who is picking up.");
    setSubmitting(true);
    setError(undefined);
    try {
      const blob = await padRef.current.toBlob();
      if (!blob) throw new Error("Please sign before confirming.");
      const id = newEventId();
      const eventTime = new Date().toISOString();
      const signatureObjectKey = await uploadSignature({ organizationId: org.id, eventId: id, date: dateKey(eventTime, org.timezone), blob });
      recordAttendanceEvent({
        id,
        organizationId: org.id,
        childId: child.id,
        guardianId,
        type: "CHECK_OUT",
        eventTime,
        deviceId: DEMO_KIOSK_DEVICE_ID,
        signatureObjectKey,
      });
      const durationMs = day?.checkIn ? new Date(eventTime).getTime() - new Date(day.checkIn.eventTime).getTime() : undefined;
      setState({ step: "done", childId: child.id, eventTime, durationMs });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.step === "select" && (
        <KioskStep key="select">
          <KioskTitle title="Check Out – Select Child" subtitle="Tap the child you're picking up." />
          <KioskChildPicker
            roster={roster}
            classrooms={classrooms}
            byChild={byChild}
            filters={[
              { id: "in", label: "Currently In", match: (_c, d) => d?.status === "IN" },
              { id: "all", label: "All Children", match: () => true },
              { id: "class", label: "By Class", match: () => true, byClass: true },
            ]}
            caption={(d) => (d?.status === "IN" && d.checkIn ? formatTime(d.checkIn.eventTime, org.timezone) : d?.status === "OUT" ? "Already picked up" : "Not checked in")}
            onSelect={select}
          />
          <div className="mt-8">
            <KioskBackButton onClick={goHome} label="Home" />
          </div>
        </KioskStep>
      )}

      {state.step === "confirm" && child && (
        <KioskStep key="confirm">
          <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Confirm Check Out</h1>
          {day?.status !== "IN" ? (
            <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-line bg-surface p-8 text-center shadow-soft">
              <ChildAvatar name={fullName(child)} size="2xl" className="mx-auto" />
              <p className="mt-5 text-2xl font-extrabold text-ink">{fullName(child)}</p>
              <p className="mt-2 text-lg text-ink-muted">
                {day?.status === "OUT" && day.checkOut
                  ? `Was already picked up at ${formatTime(day.checkOut.eventTime, org.timezone)}.`
                  : "Isn't checked in today."}
              </p>
              <Link
                href={`/kiosk/check-in?child=${child.id}`}
                className="mt-6 inline-flex h-16 items-center gap-3 rounded-2xl bg-success px-8 text-xl font-bold text-success-foreground shadow-soft"
              >
                <LogIn className="size-6" aria-hidden="true" /> Check In Instead
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col gap-6 rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
                <div className="flex items-center gap-5">
                  <ChildAvatar name={fullName(child)} photoUrl={child.photoUrl} size="2xl" />
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-ink">{fullName(child)}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-6">
                  <div>
                    <dt className="text-ink-muted">Checked In</dt>
                    <dd className="text-3xl font-extrabold text-ink tabular">{day.checkIn ? formatTime(day.checkIn.eventTime, org.timezone) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Time at Daycare</dt>
                    <dd className="text-3xl font-extrabold text-ink tabular">{hasClock && day.durationMs !== undefined ? formatDuration(day.durationMs) : "—"}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-start gap-2 rounded-2xl bg-success/10 p-4 text-sm text-ink">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                  Only authorized pickups for {child.firstName} are listed. Staff will verify ID if unsure.
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <label id="pickup-label" className="mb-2 block text-lg font-bold text-ink">
                    Who is picking up?
                  </label>
                  <Select value={guardianId} onValueChange={setGuardianId}>
                    <SelectTrigger aria-labelledby="pickup-label" className="h-16 rounded-2xl px-5 text-lg">
                      <SelectValue placeholder="Choose a guardian" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickups.map((g) => (
                        <SelectItem key={g.guardian.id} value={g.guardian.id} className="py-3 text-lg">
                          {fullName(g.guardian)} ({g.link.relationship})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-2 text-lg font-bold text-ink">Parent / Guardian Signature</p>
                  <SignaturePad ref={padRef} onInkChange={setHasInk} className="h-60" label={`Signature for ${fullName(child)} check out`} />
                </div>
                {error && (
                  <p role="alert" className="font-semibold text-danger">
                    {error}
                  </p>
                )}
                <KioskButton tone="success" className="w-full" disabled={!hasInk || !guardianId || submitting} onClick={submit}>
                  {submitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                  Confirm Check Out
                  {!submitting && <ArrowRight aria-hidden="true" />}
                </KioskButton>
              </div>
            </div>
          )}
          <div className="mt-6">
            <KioskBackButton onClick={() => setState({ step: "select" })} />
          </div>
        </KioskStep>
      )}

      {state.step === "done" && child && (
        <KioskStep key="done" className="items-center justify-center">
          <SuccessConfirmation
            tone="primary"
            title={fullName(child)}
            headline="Checked Out!"
            detail={`Today at ${formatTime(state.eventTime, org.timezone)}${state.durationMs !== undefined ? ` · ${formatDuration(state.durationMs)} at daycare` : ""}`}
            message="See you next time! 👋"
            autoResetSeconds={30}
            onTimeout={goHome}
            actions={
              <>
                <KioskButton tone="outline" className="flex-1" onClick={() => { setGuardianId(""); setState({ step: "select" }); }}>
                  <RotateCcw aria-hidden="true" /> Check Out Another Child
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
