"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CalendarClock, House, LoaderCircle, LogIn, LogOut, UserRound } from "lucide-react";
import type { Staff, StaffTimeEventType } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deriveStaffDay, timesheet } from "@/lib/domain/staff-time";
import { useTodayKey } from "@/lib/hooks/use-attendance";
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
  | { step: "identified"; member: Staff }
  | { step: "done"; member: Staff; type: StaffTimeEventType; eventTime: string };

const NETWORK_ERROR = "We couldn't reach the server. Check the connection and try again.";

/**
 * Staff are identified by PIN on the server (bcrypt hashes in D1). The kiosk
 * never receives the staff list or any PIN hash. The entered PIN is held in
 * memory only for the identified session and re-verified on every clock action.
 */
export function StaffTimeClock() {
  const org = useOrganization();
  const router = useRouter();
  const now = useNow();
  const today = useTodayKey();
  const { staffTimeEvents } = useLiveData();
  const verifiedPin = useRef<string | null>(null);
  const clientEventId = useRef<string | null>(null);
  const [state, setState] = useState<State>({ step: "pin" });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [hoursOpen, setHoursOpen] = useState(false);

  const member = state.step !== "pin" ? state.member : undefined;
  const memberDay = member ? deriveStaffDay(member, staffTimeEvents, today, org.timezone, now ?? undefined) : undefined;
  const goHome = useCallback(() => router.push("/kiosk"), [router]);

  const resetToPin = () => {
    verifiedPin.current = null;
    clientEventId.current = null;
    setError(undefined);
    setState({ step: "pin" });
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await verifyStaffPinAction({ pin: value });
      if (!result.ok) return setError(result.error.message);
      verifiedPin.current = value;
      clientEventId.current = null;
      setState({ step: "identified", member: result.data.staff });
      router.refresh(); // pull the latest clock events so the on-duty status is current
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      setPin("");
    }
  };

  const clock = async (type: StaffTimeEventType) => {
    if (!member || !verifiedPin.current) return;
    setBusy(true);
    setError(undefined);
    try {
      // Reused if this submission is retried, so the server can de-duplicate.
      clientEventId.current ??= newClientEventId();
      const input = { pin: verifiedPin.current, clientEventId: clientEventId.current };
      const result = type === "CLOCK_IN" ? await clockInStaffAction(input) : await clockOutStaffAction(input);
      if (!result.ok) return setError(result.error.message);
      // Success screen only after the server confirmed persistence.
      verifiedPin.current = null;
      clientEventId.current = null;
      router.refresh();
      setState({ step: "done", member, type, eventTime: result.data.event.eventTime });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  // Cheap to compute (one staff member, ≤ 7 days) — no memoization needed.
  const week = member
    ? timesheet(
        member.id,
        staffTimeEvents,
        distinctDates(staffTimeEvents.filter((e) => e.staffId === member.id).map((e) => e.eventTime), org.timezone).slice(0, 7),
        org.timezone,
        now ?? undefined,
      )
    : [];
  const weekTotal = week.reduce((sum, d) => sum + d.workedMs, 0);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.step !== "done" && (
        <KioskStep key="clock">
          <KioskTitle title="Staff Time Clock" subtitle="Enter your 4-digit PIN to clock in or out." />
          <div className="grid items-start gap-8 md:grid-cols-2">
            <div className="flex justify-center">
              <NumericKeypad
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  setError(undefined);
                }}
                onComplete={verify}
                busy={busy}
                error={state.step === "pin" ? error : undefined}
                label="Staff PIN"
              />
            </div>

            <div className="flex flex-col gap-4">
              {member && memberDay ? (
                <>
                  <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-soft">
                    <PersonAvatar name={fullName(member)} size="xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-2xl font-extrabold text-ink">{fullName(member)}</p>
                      <p className="text-lg text-ink-muted">{member.jobTitle}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={memberDay.status} />
                        {memberDay.status === "ON_DUTY" && memberDay.clockIn && (
                          <span className="text-sm text-ink-muted">since {formatTime(memberDay.clockIn.eventTime, org.timezone)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {error && (
                    <p role="alert" className="text-center font-semibold text-danger">
                      {error}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <KioskButton tone="success" className="h-24 text-2xl" disabled={busy || memberDay.status === "ON_DUTY"} onClick={() => clock("CLOCK_IN")}>
                      {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />} Clock In
                    </KioskButton>
                    <KioskButton tone="danger" className="h-24 text-2xl" disabled={busy || memberDay.status !== "ON_DUTY"} onClick={() => clock("CLOCK_OUT")}>
                      {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />} Clock Out
                    </KioskButton>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <KioskButton tone="outline" className="h-14 flex-1 text-lg" onClick={() => setHoursOpen(true)}>
                      <CalendarClock aria-hidden="true" /> View My Hours
                    </KioskButton>
                    <KioskButton tone="outline" className="h-14 text-lg" onClick={resetToPin}>
                      Not you?
                    </KioskButton>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line bg-surface/70 px-6 py-12 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-brand-secondary/12 text-brand-secondary">
                    <UserRound className="size-8" aria-hidden="true" />
                  </span>
                  <p className="text-xl font-bold text-ink">Your profile will appear here</p>
                  <p className="text-ink-muted">After entering your PIN you can clock in, clock out or review your hours.</p>
                </div>
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
                <DialogDescription>{member ? `${fullName(member)} · last 7 working days` : ""}</DialogDescription>
              </DialogHeader>
              <ul className="divide-y divide-line">
                {week.map((d) => (
                  <li key={d.date} className="flex items-center gap-4 py-3 text-base">
                    <span className="w-24 font-bold text-ink">{formatCalendarDate(d.date, "short")}</span>
                    <span className="flex-1 text-ink-muted tabular">
                      {d.clockIn ? formatTime(d.clockIn, org.timezone) : "—"} – {d.clockOut ? formatTime(d.clockOut, org.timezone) : "now"}
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

      {state.step === "done" && member && (
        <KioskStep key="done" className="items-center justify-center">
          <SuccessConfirmation
            tone={state.type === "CLOCK_IN" ? "success" : "primary"}
            title={fullName(member)}
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
