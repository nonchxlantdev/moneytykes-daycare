/**
 * Session mock calendar seed — dates relative to "today".
 */
import type { CalendarEvent, EventCategory } from "@/types/calendar";

const dayOffset = (offset: number): string => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  activity: "Activities",
  parent_meeting: "Parent Meetings",
  staff_meeting: "Staff Meetings",
  holiday: "Holidays",
  birthday: "Birthdays",
  special: "Special Events",
  reminder: "Reminders",
};

export function buildCalendarSeed(): CalendarEvent[] {
  return [
    {
      id: "ev_story",
      title: "Story Time",
      description: "Circle-time stories in Preschool.",
      category: "activity",
      date: dayOffset(0),
      allDay: false,
      startTime: "09:30",
      endTime: "10:00",
      location: "Preschool room",
      classroomName: "Preschool",
    },
    {
      id: "ev_outdoor",
      title: "Outdoor Play Day",
      description: "Extra outdoor rotation if weather allows.",
      category: "activity",
      date: dayOffset(1),
      allDay: false,
      startTime: "10:00",
      endTime: "11:30",
      location: "Playground",
    },
    {
      id: "ev_pt",
      title: "Parent-Teacher Meeting",
      description: "15-minute slots for Toddlers families.",
      category: "parent_meeting",
      date: dayOffset(2),
      allDay: false,
      startTime: "15:00",
      endTime: "17:00",
      location: "Front office",
      classroomName: "Toddlers",
    },
    {
      id: "ev_staff",
      title: "Staff Planning Meeting",
      description: "Week planning and ratio review.",
      category: "staff_meeting",
      date: dayOffset(3),
      allDay: false,
      startTime: "16:30",
      endTime: "17:30",
      location: "Staff room",
    },
    {
      id: "ev_art",
      title: "Art & Craft Activity",
      description: "Finger painting — please send smocks.",
      category: "activity",
      date: dayOffset(4),
      allDay: false,
      startTime: "10:30",
      endTime: "11:30",
      classroomName: "Pre-K",
    },
    {
      id: "ev_amari_bday",
      title: "Amari's Birthday",
      description: "Celebrate with cupcakes after lunch (nut-free).",
      category: "birthday",
      date: dayOffset(5),
      allDay: true,
      classroomName: "Toddlers",
    },
    {
      id: "ev_field",
      title: "Field Trip",
      description: "Community garden visit — signed forms required.",
      category: "special",
      date: dayOffset(7),
      allDay: false,
      startTime: "09:00",
      endTime: "12:00",
      location: "Community Garden",
      classroomName: "Pre-K",
    },
    {
      id: "ev_holiday",
      title: "Holiday Closure",
      description: "Center closed for public holiday.",
      category: "holiday",
      date: dayOffset(12),
      allDay: true,
    },
    {
      id: "ev_drill",
      title: "Monthly Safety Drill",
      description: "Fire drill — brief disruption expected.",
      category: "reminder",
      date: dayOffset(-1),
      allDay: false,
      startTime: "10:15",
      endTime: "10:30",
    },
    {
      id: "ev_picture",
      title: "Picture Day",
      description: "Photographer on site; class schedule posted at reception.",
      category: "special",
      date: dayOffset(6),
      allDay: true,
      location: "Multipurpose room",
    },
  ];
}
