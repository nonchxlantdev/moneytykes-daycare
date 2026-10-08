export type EventCategory =
  | "activity"
  | "parent_meeting"
  | "staff_meeting"
  | "holiday"
  | "birthday"
  | "special"
  | "reminder";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  /** YYYY-MM-DD */
  date: string;
  allDay: boolean;
  /** HH:mm when not all-day */
  startTime?: string;
  endTime?: string;
  location?: string;
  classroomId?: string;
  classroomName?: string;
}
