"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CalendarClock, House, LoaderCircle, UserRound } from "lucide-react";
import type { Staff, StaffTimeEventType } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { timesheet } from "@/lib/domain/staff-time";
import { useNow } from "@/lib/hooks/use-now";
import { newClientEventId } from "@/lib/kiosk/device";
import { clockInStaffAction, clockOutStaffAction, verifyStaffPinAction } from "@/lib/server/actions";
import { useLiveData } from "@/lib/store/live-data";
import { distinctDates, formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";
import { KioskBackButton, KioskButton, KioskStep, KioskTitle } from "./kiosk-screen";
import { NumericKeypad } from "./numeric-keypad";
import { SuccessConfirmation } from "./success-confirmation";

type State =
  | { step: "pin" }
  | { step: "working"; member: Staff }
  | { step: "done"; member: Staff; type: StaffTimeEventType; eventTime: string };

const NETWORK_ERROR = "We couldn't reach the server. Check the connection and try again.";

/**
 * Staff enter a PIN; the kiosk auto clock-in/out from the server duty status
 * (off duty → clock in, on duty → clock out). No separate in/out buttons.
 */
export function StaffTimeClock() {
  const org = useOrganization();
  const router = useRouter();
  const now = useNow();
  const { staffTimeEvents } = useLiveData();
  const clientEventId = useRef<string | null>(null);
  const [state, setState] = useState<State>({ step: "pin" });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursMember, setHoursMember] = useState<Staff | null>(null);

  const goHome = useCallback(() => router.push("/kiosk"), [router]);

  const verifyAndStamp = async (value: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const verified = await verifyStaffPinAction({ pin: value });
      if (!verified.ok) {
        setError(verified.error.message);
        return;
      }
      const { staff: member, onDuty } = verified.data;
      setState({ step: "working", member });
      setHoursMember(member);

      clientEventId.current ??= newClientEventId();
      const type: StaffTimeEventType = onDuty ? "CLOCK_OUT" : "CLOCK_IN";
      const input = { pin: value, clientEventId: clientEventId.current };
      const result = type === "CLOCK_IN" ? await clockInStaffAction(input) : await clockOutStaffAction(input);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      clientEventId.current = null;
      router.refresh();
      setState({ step: "done", member, type, eventTime: result.data.event.eventTime });
    } catch {
      setError(NETWORK_ERROR);
      setState({ step: "pin" });
    } finally {
      setBusy(false);
      setPin("");
    }
  };

  const member = state.step === "working" || state.step === "done" ? state.member : hoursMember;
  const week = member?.id
    ? timesheet(
        member.id,
        staffTimeEvents,
        distinctDates(
          staffTimeEvents.filter((e) => e.staffId === member.id).map((e) => e.eventTime),
          org.timezone,
        ).slice(0, 7),
        org.timezone,
        now ?? undefined,
      )
    : [];
  const weekTotal = week.reduce((sum, d) => sum + d.workedMs, 0);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.step !== "done" && (
        <KioskStep key="clock">
          <KioskTitle
            title="Staff Time Clock"
            subtitle="Enter your 4-digit PIN — we'll clock you in or out automatically."
          />
          <div className="grid items-start gap-8 md:grid-cols-2">
            <div className="flex justify-center">
              <NumericKeypad
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  setError(undefined);
                }}
                onComplete={verifyAndStamp}
                busy={busy}
                error={state.step === "pin" ? error : undefined}
                label="Staff PIN"
              />
            </div>

            <div className="flex flex-col gap-4">
              {state.step === "working" && state.member.id ? (
                <>
                  <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft">
                    <PersonAvatar name={fullName(state.member)} size="xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-2xl font-extrabold text-ink">{fullName(state.member)}</p>
                      <p className="text-lg text-ink-muted">{state.member.jobTitle}</p>
                      <div className="mt-2 flex items-center gap-2 text-ink-muted">
                        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                        <span className="font-semibold">Recording your time…</span>
                      </div>
                    </div>
                  </div>
                  {error && (
                    <p role="alert" className="text-center font-semibold text-danger">
                      {error}
                    </p>
                  )}
                  {error && (
                    <KioskButton tone="outline" className="h-14 text-lg" onClick={() => setState({ step: "pin" })}>
                      Try again
                    </KioskButton>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line bg-surface/70 px-6 py-12 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-brand-secondary/12 text-brand-secondary">
                    <UserRound className="size-8" aria-hidden="true" />
                  </span>
                  <p className="text-xl font-bold text-ink">Enter your PIN</p>
                  <p className="text-ink-muted">
                    If you&apos;re off duty we clock you in. If you&apos;re on duty we clock you out.
                  </p>
                </div>
              )}
              {hoursMember?.id && (
                <KioskButton tone="outline" className="h-14 text-lg" onClick={() => setHoursOpen(true)}>
                  <CalendarClock aria-hidden="true" /> View My Hours
                </KioskButton>
              )}
            </div>
          </div>
          <div className="mt-8">
            <KioskBackButton onClick={goHome} label="Home" />
          </div>

          <Dialog open={hoursOpen} onOpenChange={setHoursOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>My Hours</DialogTitle>
                <DialogDescription>
                  {hoursMember ? `${fullName(hoursMember)} · last 7 working days` : ""}
                </DialogDescription>
              </DialogHeader>
              <ul className="divide-y divide-line">
                {week.map((d) => (
                  <li key={d.date} className="flex items-center gap-4 py-3 text-base">
                    <span className="w-24 font-bold text-ink">{formatCalendarDate(d.date, "short")}</span>
                    <span className="flex-1 text-ink-muted tabular">
                      {d.clockIn ? formatTime(d.clockIn, org.timezone) : "—"} –{" "}
                      {d.clockOut ? formatTime(d.clockOut, org.timezone) : "now"}
                    </span>
                    <span className="font-bold text-ink tabular">{formatDuration(d.workedMs)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-secondary/10 px-5 py-4">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-2xl font-extrabold text-ink tabular">{formatDuration(weekTotal)}</span>
              </div>
            </DialogContent>
          </Dialog>
        </KioskStep>
      )}

      {state.step === "done" && (
        <KioskStep key="done" className="items-center justify-center">
          <SuccessConfirmation
            tone={state.type === "CLOCK_IN" ? "success" : "primary"}
            title={fullName(state.member)}
            headline={state.type === "CLOCK_IN" ? "Clocked In!" : "Clocked Out!"}
            detail={`Today at ${formatTime(state.eventTime, org.timezone)}`}
            message={state.type === "CLOCK_IN" ? "Have a great shift! ☀️" : "Thanks for today — rest well!"}
            autoResetSeconds={15}
            onTimeout={goHome}
            actions={
              <KioskButton tone="primary" className="flex-1" onClick={goHome}>
                <House aria-hidden="true" /> Return to Home
              </KioskButton>
            }
          />
        </KioskStep>
      )}
    </AnimatePresence>
  );
}
