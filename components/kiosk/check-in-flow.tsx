"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { ArrowRight, House, LoaderCircle, LogOut, RotateCcw } from "lucide-react";
import type { ChildRecord, Classroom } from "@/types/domain";
import { useOrganization } from "@/components/shared/organization-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { newClientEventId } from "@/lib/kiosk/device";
import { checkInChildAction } from "@/lib/server/actions";
import { isUsableSignature } from "@/lib/services/signature-storage";
import { formatTime, fullName } from "@/lib/utils";
import { ChildSummaryCard } from "./child-summary-card";
import { KioskChildPicker } from "./kiosk-child-picker";
import { KioskBackButton, KioskButton, KioskStep, KioskTitle } from "./kiosk-screen";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { SuccessConfirmation } from "./success-confirmation";

type State =
  | { step: "select" }
  | { step: "sign"; childId: string }
  | { step: "done"; childId: string; eventTime: string };

function primaryPickupId(child?: ChildRecord): string {
  if (!child) return "";
  return (
    child.guardians.find((g) => g.link.canPickUp && g.link.isPrimary)?.guardian.id ??
    child.guardians.find((g) => g.link.canPickUp)?.guardian.id ??
    ""
  );
}

/** Pick child → sign (guardian name printed) → submit. No PIN / confirm steps. */
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
  const padRef = useRef<SignaturePadHandle>(null);
  const { byChild } = useChildDays(roster);
  const [state, setState] = useState<State>(() =>
    initialChildId && roster.some((c) => c.id === initialChildId) ? { step: "sign", childId: initialChildId } : { step: "select" },
  );
  const [guardianId, setGuardianId] = useState(() => primaryPickupId(roster.find((c) => c.id === initialChildId)));
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const child = state.step !== "select" ? roster.find((c) => c.id === state.childId) : undefined;
  const pickups = child?.guardians.filter((g) => g.link.canPickUp) ?? [];
  const signer = pickups.find((g) => g.guardian.id === guardianId);
  const signerName = signer ? fullName(signer.guardian) : "";
  const classroomName = (id: string) => classrooms.find((c) => c.id === id)?.name ?? id;
  const goHome = useCallback(() => router.push("/kiosk"), [router]);

  const openSign = (c: ChildRecord) => {
    clientEventId.current = null;
    setGuardianId(primaryPickupId(c));
    setHasInk(false);
    setError(undefined);
    setState({ step: "sign", childId: c.id });
  };

  const submit = async () => {
    if (!child || !padRef.current) return;
    if (!guardianId) return setError("Please choose who is signing.");
    setSubmitting(true);
    setError(undefined);
    try {
      if (!isUsableSignature(await padRef.current.toBlob())) {
        setError("Please sign before submitting.");
        return;
      }
      clientEventId.current ??= newClientEventId();
      const result = await checkInChildAction({ childId: child.id, guardianId, clientEventId: clientEventId.current });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      clientEventId.current = null;
      setHasInk(false);
      router.refresh();
      setState({ step: "done", childId: child.id, eventTime: result.data.event.eventTime });
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
          <KioskTitle title="Select a Child" subtitle="Tap your child's name, then sign to check them in." />
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
            onSelect={openSign}
          />
          <div className="mt-8">
            <KioskBackButton onClick={goHome} label="Home" />
          </div>
        </KioskStep>
      )}

      {state.step === "sign" && child && (
        <KioskStep key="sign">
          {byChild.get(child.id)?.status === "IN" ? (
            <div className="mx-auto w-full max-w-3xl">
              <ChildSummaryCard
                name={fullName(child)}
                photoUrl={child.photoUrl}
                rows={[
                  { label: "Class", value: child.classroomId ? classroomName(child.classroomId) : "—" },
                  {
                    label: "Status",
                    value: `Already in · ${formatTime(byChild.get(child.id)!.checkIn!.eventTime, org.timezone)}`,
                  },
                ]}
              />
              <div className="mt-6 rounded-3xl border border-warning/40 bg-warning/10 p-6 text-center">
                <p className="text-xl font-bold text-ink">{child.firstName} is already checked in today.</p>
                <Link
                  href={`/kiosk/check-out?child=${child.id}`}
                  className="mt-5 inline-flex h-16 items-center gap-3 rounded-2xl bg-primary px-8 text-xl font-bold text-primary-foreground shadow-soft"
                >
                  <LogOut className="size-6" aria-hidden="true" /> Go to Check Out
                </Link>
              </div>
              <div className="mt-6">
                <KioskBackButton onClick={() => setState({ step: "select" })} />
              </div>
            </div>
          ) : (
            <>
              <KioskTitle
                title="Sign to Check In"
                subtitle={
                  <>
                    Sign below for <strong className="text-ink">{fullName(child)}</strong>. Then submit.
                  </>
                }
              />
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
                {pickups.length > 1 && (
                  <div>
                    <label id="signer-label" className="mb-2 block text-lg font-bold text-ink">
                      Parent / guardian
                    </label>
                    <Select value={guardianId} onValueChange={setGuardianId}>
                      <SelectTrigger aria-labelledby="signer-label" className="h-14 rounded-2xl px-5 text-lg">
                        <SelectValue placeholder="Choose who is signing" />
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
                )}
                <SignaturePad
                  ref={padRef}
                  onInkChange={setHasInk}
                  signerName={signerName || undefined}
                  className="h-72 w-full sm:h-80"
                  label={`Signature for ${fullName(child)} check in`}
                />
                {error && (
                  <p role="alert" className="text-center font-semibold text-danger">
                    {error}
                  </p>
                )}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <KioskBackButton onClick={() => setState({ step: "select" })} />
                  <KioskButton tone="primary" disabled={!hasInk || !guardianId || submitting} onClick={submit}>
                    {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                    Sign &amp; Submit
                    {!submitting && <ArrowRight aria-hidden="true" />}
                  </KioskButton>
                </div>
              </div>
            </>
          )}
        </KioskStep>
      )}

      {state.step === "done" && child && (
        <KioskStep key="done" className="items-center justify-center">
          <SuccessConfirmation
            title={fullName(child)}
            headline="Checked In!"
            detail={`Today at ${formatTime(state.eventTime, org.timezone)}`}
            message="Have a wonderful day!"
            autoResetSeconds={30}
            onTimeout={goHome}
            actions={
              <>
                <KioskButton tone="outline" className="flex-1" onClick={() => setState({ step: "select" })}>
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
