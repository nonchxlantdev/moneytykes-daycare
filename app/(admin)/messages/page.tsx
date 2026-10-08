import type { Metadata } from "next";
import { MessagesCenter } from "@/components/messages/messages-center";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return <MessagesCenter />;
}
