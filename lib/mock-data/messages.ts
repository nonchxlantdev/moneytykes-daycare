/**
 * Session mock messaging seed — not persisted.
 */
import type { Conversation, Message, MessageContact } from "@/types/messages";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number, hour = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, 15, 0, 0);
  return t.toISOString();
};

export const MESSAGE_CONTACTS: MessageContact[] = [
  { id: "mc_sarah", name: "Sarah Young", kind: "parent", subtitle: "Parent of Amari Young" },
  { id: "mc_michael", name: "Michael Carter", kind: "staff", subtitle: "Assistant Teacher" },
  { id: "mc_olivia", name: "Olivia Martin", kind: "parent", subtitle: "Parent · Pre-K" },
  { id: "mc_jasmine", name: "Jasmine Green", kind: "staff", subtitle: "Infant Caregiver" },
  { id: "mc_emma_g", name: "David White", kind: "parent", subtitle: "Guardian of Emma White" },
  { id: "mc_nina", name: "Nina Carter", kind: "parent", subtitle: "Parent of Liam Carter" },
];

export function buildMessageSeed(): { conversations: Conversation[]; messages: Message[] } {
  const messages: Message[] = [
    // Sarah Young
    { id: "m1", conversationId: "c_sarah", senderId: "mc_sarah", body: "Good morning! Amari forgot his water bottle — is he okay until pickup?", sentAt: daysAgo(1, 8), status: "read" },
    { id: "m2", conversationId: "c_sarah", senderId: null, body: "He's doing great — we have spare cups in Toddlers. See you at 3:30!", sentAt: daysAgo(1, 8), status: "read" },
    { id: "m3", conversationId: "c_sarah", senderId: "mc_sarah", body: "Perfect, thank you. Also, can we confirm picture day next week?", sentAt: hoursAgo(5), status: "delivered" },
    { id: "m4", conversationId: "c_sarah", senderId: null, body: "Yes — Wednesday morning. We'll send a reminder tomorrow.", sentAt: hoursAgo(4), status: "sent" },
    { id: "m5", conversationId: "c_sarah", senderId: "mc_sarah", body: "Wonderful. Appreciate you!", sentAt: hoursAgo(3), status: "delivered" },

    // Michael Carter
    { id: "m6", conversationId: "c_michael", senderId: "mc_michael", body: "Can someone cover outdoor play at 10 if I'm delayed from the dentist?", sentAt: daysAgo(2, 7), status: "read" },
    { id: "m7", conversationId: "c_michael", senderId: null, body: "I've got Preschool covered. Text me when you're on your way.", sentAt: daysAgo(2, 7), status: "read" },
    { id: "m8", conversationId: "c_michael", senderId: "mc_michael", body: "Ratio sheet for tomorrow is updated in the staff binder.", sentAt: hoursAgo(26), status: "read" },

    // Olivia Martin
    { id: "m9", conversationId: "c_olivia", senderId: null, body: "Hi Olivia — just confirming Grace is picking up Sophie today?", sentAt: daysAgo(3, 14), status: "read" },
    { id: "m10", conversationId: "c_olivia", senderId: "mc_olivia", body: "Yes, grandmother will be there around 4.", sentAt: daysAgo(3, 14), status: "read" },
    { id: "m11", conversationId: "c_olivia", senderId: "mc_olivia", body: "Could you share the field trip permission form again?", sentAt: hoursAgo(8), status: "delivered" },

    // Jasmine Green
    { id: "m12", conversationId: "c_jasmine", senderId: "mc_jasmine", body: "Noah's diaper cream is running low — please ask parents for a refill.", sentAt: hoursAgo(6), status: "delivered" },
    { id: "m13", conversationId: "c_jasmine", senderId: "mc_jasmine", body: "Also Ethan had a great morning with tummy time!", sentAt: hoursAgo(2), status: "delivered" },

    // David White
    { id: "m14", conversationId: "c_emma", senderId: null, body: "Emma's allergy note is on file. Please remind the kitchen about the snack plan.", sentAt: daysAgo(4, 9), status: "read" },
    { id: "m15", conversationId: "c_emma", senderId: "mc_emma_g", body: "Thanks — we packed a safe snack for her today.", sentAt: daysAgo(4, 10), status: "read" },
    { id: "m16", conversationId: "c_emma", senderId: "mc_emma_g", body: "Will Emma need rain boots tomorrow?", sentAt: hoursAgo(1), status: "delivered" },
  ];

  const last = (cid: string) =>
    messages.filter((m) => m.conversationId === cid).sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];

  const conversations: Conversation[] = [
    { id: "c_sarah", contactId: "mc_sarah", unreadCount: 1, updatedAt: last("c_sarah").sentAt },
    { id: "c_michael", contactId: "mc_michael", unreadCount: 0, updatedAt: last("c_michael").sentAt },
    { id: "c_olivia", contactId: "mc_olivia", unreadCount: 1, updatedAt: last("c_olivia").sentAt },
    { id: "c_jasmine", contactId: "mc_jasmine", unreadCount: 2, updatedAt: last("c_jasmine").sentAt },
    { id: "c_emma", contactId: "mc_emma_g", unreadCount: 1, updatedAt: last("c_emma").sentAt },
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { conversations, messages };
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-BZ", { month: "short", day: "numeric" });
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatMessageDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
