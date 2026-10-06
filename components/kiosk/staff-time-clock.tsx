"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CalendarClock, House, LogIn, LogOut, UserRound } from "lucide-react";
import type { Staff, StaffTimeEventType } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEMO_STAFF_PINS, mockVerifyStaffPin } from "@/lib/auth/mock-kiosk-auth";
import { deriveStaffDay, timesheet } from "@/lib/domain/staff-time";
import { useTodayKey } from "@/lib/hooks/use-attendance";
import { useNow } from "@/lib/hooks/use-now";
import { DEMO_KIOSK_DEVICE_ID } from "@/lib/kiosk/device";
import { useDemoStore } from "@/lib/store/demo-store";
import { distinctDates, formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";
import { KioskBackButton, KioskButton, KioskStep, KioskTitle } from "./kiosk-screen";
import { NumericKeypad } from "./numeric-keypad";
import { SuccessConfirmation } from "./success-confirmation";

type State =
  | { step: "pin" }
  | { step: "identified"; staffId: string }
  | { step: "done"; staffId: string; type: StaffTimeEventType; eventTime: string };

export function StaffTimeClock({ staff }: { staff: Staff[] }) {
  const org = useOrganization();
  const router = useRouter();
  const now = useNow();
  const today = useTodayKey();
  const { staffTimeEvents, recordStaffTimeEvent } = useDemoStore();
  const [state, setState] = useState<State>({ step: "pin" });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [hoursOpen, setHoursOpen] = useState(false);

  const member = state.step !== "pin" ? staff.find((s) => s.id === state.staffId) : undefined;
  const memberDay = member ? deriveStaffDay(member, staffTimeEvents, today, org.timezone, now ?? undefined) : undefined;
  const goHome = useCallback(() => router.push("/kiosk"), [router]);

  const verify = async (value: string) => {
    setBusy(true);
    setError(undefined);
    const result = await mockVerifyStaffPin(value, staff);
    setBusy(false);
    setPin("");
    if (!result.ok) return setError(result.reason);
    setState({ step: "identified", staffId: result.value.id });
  };

  const clock = (type: StaffTimeEventType) => {
    if (!member) return;
    const eventTime = new Date().toISOString();
    recordStaffTimeEvent({ organizationId: org.id, staffId: member.id, type, eventTime, deviceId: DEMO_KIOSK_DEVICE_ID });
    setState({ step: "done", staffId: member.id, type, eventTime });
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
                error={error}
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
                      <p className="text-lg text-ink-muted">{member.role}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={memberDay.status} />
                        {memberDay.status === "ON_DUTY" && memberDay.clockIn && (
                          <span className="text-sm text-ink-muted">since {formatTime(memberDay.clockIn.eventTime, org.timezone)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <KioskButton tone="success" className="h-24 text-2xl" disabled={memberDay.status === "ON_DUTY"} onClick={() => clock("CLOCK_IN")}>
                      <LogIn aria-hidden="true" /> Clock In
                    </KioskButton>
                    <KioskButton tone="danger" className="h-24 text-2xl" disabled={memberDay.status !== "ON_DUTY"} onClick={() => clock("CLOCK_OUT")}>
                      <LogOut aria-hidden="true" /> Clock Out
                    </KioskButton>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <KioskButton tone="outline" className="h-14 flex-1 text-lg" onClick={() => setHoursOpen(true)}>
                      <CalendarClock aria-hidden="true" /> View My Hours
                    </KioskButton>
                    <KioskButton tone="outline" className="h-14 text-lg" onClick={() => setState({ step: "pin" })}>
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
                  <details className="mt-3 text-sm text-ink-subtle">
                    <summary className="cursor-pointer font-semibold">Demo PINs</summary>
                    <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-left">
                      {Object.entries(DEMO_STAFF_PINS).map(([p, id]) => {
                        const s = staff.find((x) => x.id === id);
                        return s ? (
                          <li key={p}>
                            <span className="font-mono font-bold text-ink">{p}</span> {s.firstName}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </details>
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
