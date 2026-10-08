export type DocumentCategory =
  | "enrollment"
  | "parent_agreements"
  | "medical"
  | "staff"
  | "policies"
  | "financial"
  | "general";

export type DocumentMime = "pdf" | "image" | "doc" | "other";

export interface DocumentFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: DocumentCategory;
  folderId: string | null;
  mime: DocumentMime;
  /** Bytes */
  size: number;
  updatedAt: string;
  /** Session-only object URL for user uploads */
  objectUrl?: string;
  /** True when created via the upload dialog this session */
  isSessionUpload?: boolean;
}
