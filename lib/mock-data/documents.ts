/**
 * Session mock documents — metadata only; no real file bytes.
 */
import type { DocumentCategory, DocumentFolder, DocumentItem } from "@/types/documents";

const daysAgo = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString();
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  enrollment: "Enrollment Forms",
  parent_agreements: "Parent Agreements",
  medical: "Medical Forms",
  staff: "Staff Documents",
  policies: "Policies & Procedures",
  financial: "Financial Documents",
  general: "General Documents",
};

export const DEMO_STORAGE_USED_BYTES = 48 * 1024 * 1024;
export const DEMO_STORAGE_TOTAL_BYTES = 500 * 1024 * 1024;

export function buildDocumentsSeed(): { folders: DocumentFolder[]; documents: DocumentItem[] } {
  const folders: DocumentFolder[] = [
    { id: "fld_enrollment", name: "Enrollment", createdAt: daysAgo(90) },
    { id: "fld_medical", name: "Medical", createdAt: daysAgo(80) },
    { id: "fld_policies", name: "Policies", createdAt: daysAgo(100) },
    { id: "fld_staff", name: "Staff HR", createdAt: daysAgo(70) },
  ];

  const documents: DocumentItem[] = [
    { id: "doc1", name: "Child Enrollment Form.pdf", category: "enrollment", folderId: "fld_enrollment", mime: "pdf", size: 245_000, updatedAt: daysAgo(12) },
    { id: "doc2", name: "Parent Handbook.pdf", category: "parent_agreements", folderId: "fld_policies", mime: "pdf", size: 1_820_000, updatedAt: daysAgo(40) },
    { id: "doc3", name: "Emergency Contact Form.pdf", category: "enrollment", folderId: "fld_enrollment", mime: "pdf", size: 180_000, updatedAt: daysAgo(8) },
    { id: "doc4", name: "Medication Authorization.pdf", category: "medical", folderId: "fld_medical", mime: "pdf", size: 210_000, updatedAt: daysAgo(5) },
    { id: "doc5", name: "Staff Agreement.pdf", category: "staff", folderId: "fld_staff", mime: "pdf", size: 320_000, updatedAt: daysAgo(25) },
    { id: "doc6", name: "Daycare Policies.pdf", category: "policies", folderId: "fld_policies", mime: "pdf", size: 980_000, updatedAt: daysAgo(60) },
    { id: "doc7", name: "Payment Agreement.pdf", category: "financial", folderId: null, mime: "pdf", size: 275_000, updatedAt: daysAgo(15) },
    { id: "doc8", name: "Daily Attendance Template.pdf", category: "general", folderId: null, mime: "pdf", size: 95_000, updatedAt: daysAgo(3) },
  ];

  return { folders, documents };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
