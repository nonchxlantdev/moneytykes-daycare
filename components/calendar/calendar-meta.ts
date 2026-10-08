import { Cake, ClipboardList, Flag, PartyPopper, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { EventCategory } from "@/types/calendar";
import { EVENT_CATEGORY_LABELS } from "@/lib/mock-data/calendar";

export const EVENT_CATEGORY_META: Record<EventCategory, { label: string; tone: string; icon: LucideIcon }> = {
  activity: { label: EVENT_CATEGORY_LABELS.activity, tone: "bg-primary/15 text-primary", icon: Sparkles },
  parent_meeting: { label: EVENT_CATEGORY_LABELS.parent_meeting, tone: "bg-brand-secondary/15 text-brand-secondary", icon: Users },
  staff_meeting: { label: EVENT_CATEGORY_LABELS.staff_meeting, tone: "bg-ink/10 text-ink", icon: ClipboardList },
  holiday: { label: EVENT_CATEGORY_LABELS.holiday, tone: "bg-danger/12 text-danger", icon: Flag },
  birthday: { label: EVENT_CATEGORY_LABELS.birthday, tone: "bg-brand-accent/20 text-brand-accent", icon: Cake },
  special: { label: EVENT_CATEGORY_LABELS.special, tone: "bg-success/15 text-success", icon: PartyPopper },
  reminder: { label: EVENT_CATEGORY_LABELS.reminder, tone: "bg-warning/20 text-warning", icon: ClipboardList },
};

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDaysDate(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function monthMatrix(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDaysDate(start, i));
}
