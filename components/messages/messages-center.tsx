"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageSquare,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import {
  MESSAGE_CONTACTS,
  buildMessageSeed,
  formatMessageDay,
  formatMessageTime,
  formatRelativeTime,
} from "@/lib/mock-data/messages";
import { cn } from "@/lib/utils";
import type { Conversation, Message, MessageContact } from "@/types/messages";

type Filter = "all" | "unread" | "staff";

const seed = buildMessageSeed();

export function MessagesCenter() {
  const [conversations, setConversations] = useState<Conversation[]>(seed.conversations);
  const [messages, setMessages] = useState<Message[]>(seed.messages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const contactsById = useMemo(() => new Map(MESSAGE_CONTACTS.map((c) => [c.id, c])), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const contact = contactsById.get(c.contactId);
      if (!contact) return false;
      if (filter === "unread" && c.unreadCount === 0) return false;
      if (filter === "staff" && contact.kind !== "staff") return false;
      if (q && !contact.name.toLowerCase().includes(q) && !contact.subtitle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversations, contactsById, filter, query]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const selectedContact = selected ? contactsById.get(selected.contactId) : undefined;
  const thread = useMemo(
    () =>
      selected
        ? messages.filter((m) => m.conversationId === selected.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt))
        : [],
    [messages, selected],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, selectedId]);

  const openConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowThread(true);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  };

  const sendMessage = (body: string, conversationId: string) => {
    const text = body.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const msg: Message = {
      id: crypto.randomUUID(),
      conversationId,
      senderId: null,
      body: text,
      sentAt: now,
      status: "sent",
    };
    setMessages((prev) => [...prev, msg]);
    setConversations((prev) =>
      prev
        .map((c) => (c.id === conversationId ? { ...c, updatedAt: now, unreadCount: 0 } : c))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
    setDraft("");
    window.setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "delivered" } : m)));
    }, 600);
  };

  const startConversation = (contact: MessageContact, body: string) => {
    const text = body.trim();
    if (!text) return;
    const existing = conversations.find((c) => c.contactId === contact.id);
    if (existing) {
      openConversation(existing.id);
      sendMessage(text, existing.id);
      return;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg: Message = {
      id: crypto.randomUUID(),
      conversationId: id,
      senderId: null,
      body: text,
      sentAt: now,
      status: "sent",
    };
    setConversations((prev) => [{ id, contactId: contact.id, unreadCount: 0, updatedAt: now }, ...prev]);
    setMessages((prev) => [...prev, msg]);
    setSelectedId(id);
    setMobileShowThread(true);
  };

  const unreadTotal = conversations.reduce((n, c) => n + c.unreadCount, 0);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Messages"
        description="Talk with families and staff — session demo (not saved)."
        actions={<NewMessageDialog contacts={MESSAGE_CONTACTS} onSend={startConversation} />}
      />

      <div className="grid min-h-[min(70dvh,720px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-line lg:border-r",
            mobileShowThread && selected ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex flex-col gap-3 border-b border-line p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="pl-9"
                aria-label="Search conversations"
              />
            </div>
            <div className="flex gap-1" role="tablist" aria-label="Filter conversations">
              {(
                [
                  ["all", "All"],
                  ["unread", `Unread${unreadTotal ? ` (${unreadTotal})` : ""}`],
                  ["staff", "Staff"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  onClick={() => setFilter(id)}
                  className={cn(
                    "h-8 flex-1 rounded-lg px-2 text-xs font-semibold transition-colors",
                    filter === id ? "bg-primary text-primary-foreground" : "bg-muted text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li>
                <EmptyState icon={MessageSquare} title="No conversations" description="Try another filter or start a new message." className="py-10" />
              </li>
            ) : (
              filtered.map((c) => {
                const contact = contactsById.get(c.contactId)!;
                const last = messages
                  .filter((m) => m.conversationId === c.id)
                  .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/80",
                        active && "bg-primary/8",
                      )}
                    >
                      <PersonAvatar name={contact.name} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm font-bold text-ink", c.unreadCount > 0 && "text-primary")}>
                            {contact.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-ink-subtle tabular">{formatRelativeTime(c.updatedAt)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-ink-muted">{last?.body ?? "No messages yet"}</span>
                          {c.unreadCount > 0 && (
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {c.unreadCount}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Thread */}
        <section
          className={cn(
            "flex min-h-0 flex-col",
            !mobileShowThread || !selected ? "hidden lg:flex" : "flex",
          )}
        >
          {!selected || !selectedContact ? (
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a family or staff member from the list, or start a new message."
              className="flex-1"
            />
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft />
                </Button>
                <PersonAvatar name={selectedContact.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{selectedContact.name}</p>
                  <p className="truncate text-xs text-ink-muted">{selectedContact.subtitle}</p>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {thread.map((m, i) => {
                  const prev = thread[i - 1];
                  const showDay = !prev || formatMessageDay(prev.sentAt) !== formatMessageDay(m.sentAt);
                  const mine = m.senderId === null;
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <p className="my-3 text-center text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">
                          {formatMessageDay(m.sentAt)}
                        </p>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex", mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-soft sm:max-w-[70%]",
                            mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-ink",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p
                            className={cn(
                              "mt-1 flex items-center justify-end gap-1 text-[10px]",
                              mine ? "text-primary-foreground/75" : "text-ink-subtle",
                            )}
                          >
                            {formatMessageTime(m.sentAt)}
                            {mine && (m.status === "read" || m.status === "delivered" ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <footer className="border-t border-line p-3">
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(draft, selected.id);
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(draft, selected.id);
                      }
                    }}
                    rows={2}
                    placeholder="Write a message…"
                    aria-label="Message"
                    className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                  />
                  <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message">
                    <Send />
                  </Button>
                </form>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function NewMessageDialog({
  contacts,
  onSend,
}: {
  contacts: MessageContact[];
  onSend: (contact: MessageContact, body: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [contactId, setContactId] = useState("");
  const [body, setBody] = useState("");

  const list = contacts.filter(
    (c) => !q.trim() || c.name.toLowerCase().includes(q.toLowerCase()) || c.subtitle.toLowerCase().includes(q.toLowerCase()),
  );

  const submit = () => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || !body.trim()) return;
    onSend(contact, body.trim());
    setOpen(false);
    setQ("");
    setContactId("");
    setBody("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Pick a contact and write your first message. Session only — not saved permanently.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="nm-search">Recipient</Label>
            <Input id="nm-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="mt-1" />
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-line">
              <AnimatePresence initial={false}>
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setContactId(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                        contactId === c.id && "bg-primary/10",
                      )}
                    >
                      <PersonAvatar name={c.name} size="sm" />
                      <span>
                        <span className="block font-semibold text-ink">{c.name}</span>
                        <span className="block text-xs text-ink-muted">{c.subtitle}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
          <div>
            <Label htmlFor="nm-body">Message</Label>
            <textarea
              id="nm-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!contactId || !body.trim()} onClick={submit}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
