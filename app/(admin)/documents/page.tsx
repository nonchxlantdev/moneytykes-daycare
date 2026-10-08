import type { Metadata } from "next";
import { DocumentsCenter } from "@/components/documents/documents-center";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return <DocumentsCenter />;
}
