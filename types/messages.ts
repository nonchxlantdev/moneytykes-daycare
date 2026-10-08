export type MessageContactKind = "parent" | "staff";

export interface MessageContact {
  id: string;
  name: string;
  kind: MessageContactKind;
  /** e.g. "Parent of Amari Young" or "Lead Teacher" */
  subtitle: string;
  avatarSeed?: string;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface Message {
  id: string;
  conversationId: string;
  /** null = current operator (outgoing) */
  senderId: string | null;
  body: string;
  sentAt: string; // ISO
  status: MessageStatus;
}

export interface Conversation {
  id: string;
  contactId: string;
  unreadCount: number;
  updatedAt: string; // ISO of last message
}
