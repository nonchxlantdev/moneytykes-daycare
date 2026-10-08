"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Folder,
  FolderPlus,
  Grid3x3,
  List,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEMO_STORAGE_TOTAL_BYTES,
  DEMO_STORAGE_USED_BYTES,
  DOCUMENT_CATEGORY_LABELS,
  buildDocumentsSeed,
  formatFileSize,
} from "@/lib/mock-data/documents";
import { cn } from "@/lib/utils";
import type { DocumentCategory, DocumentFolder, DocumentItem } from "@/types/documents";

type SortKey = "name" | "date" | "size";
type ViewMode = "grid" | "list";

const seed = buildDocumentsSeed();
const CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"];

export function DocumentsCenter() {
  const [folders, setFolders] = useState<DocumentFolder[]>(seed.folders);
  const [documents, setDocuments] = useState<DocumentItem[]>(seed.documents);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [folderFilter, setFolderFilter] = useState<string | "all" | "none">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveFolder, setMoveFolder] = useState<string>("none");
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderRenameId, setFolderRenameId] = useState<string | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Revoke session object URLs on unmount
  useEffect(() => {
    return () => {
      for (const d of documents) {
        if (d.objectUrl) URL.revokeObjectURL(d.objectUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const filtered = useMemo(() => {
    let rows = [...documents];
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((d) => d.name.toLowerCase().includes(q));
    if (category !== "all") rows = rows.filter((d) => d.category === category);
    if (folderFilter === "none") rows = rows.filter((d) => !d.folderId);
    else if (folderFilter !== "all") rows = rows.filter((d) => d.folderId === folderFilter);
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return b.size - a.size;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return rows;
  }, [documents, query, category, folderFilter, sort]);

  const recent = useMemo(
    () => [...documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [documents],
  );

  const selected = documents.find((d) => d.id === selectedId) ?? null;
  const usedPct = Math.min(100, Math.round((DEMO_STORAGE_USED_BYTES / DEMO_STORAGE_TOTAL_BYTES) * 100));

  const addUploaded = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) throw new Error(`File type not allowed (${ext || "unknown"}).`);
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("File must be 10 MB or smaller.");
    const mime: DocumentItem["mime"] = ext === ".pdf" ? "pdf" : [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? "image" : ext.startsWith(".doc") ? "doc" : "other";
    const objectUrl = URL.createObjectURL(file);
    const item: DocumentItem = {
      id: crypto.randomUUID(),
      name: file.name,
      category: "general",
      folderId: folderFilter !== "all" && folderFilter !== "none" ? folderFilter : null,
      mime,
      size: file.size,
      updatedAt: new Date().toISOString(),
      objectUrl,
      isSessionUpload: true,
    };
    setDocuments((prev) => [item, ...prev]);
    setSelectedId(item.id);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Documents"
        description="Policies, forms and templates for your daycare."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus /> New Folder
            </Button>
            <Button type="button" onClick={() => setUploadOpen(true)}>
              <Upload /> Upload Document
            </Button>
          </div>
        }
      />

      <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-ink">
        Demo mode — files are not permanently saved. Uploads stay in this browser session only.
      </p>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…" className="pl-9" aria-label="Search documents" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={folderFilter} onValueChange={(v) => setFolderFilter(v as typeof folderFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              <SelectItem value="none">No folder</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by date</SelectItem>
              <SelectItem value="name">Sort by name</SelectItem>
              <SelectItem value="size">Sort by size</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border border-line p-1">
            <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")} className={cn("flex size-9 items-center justify-center rounded-lg", view === "grid" && "bg-primary text-primary-foreground")}>
              <Grid3x3 className="size-4" />
            </button>
            <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")} className={cn("flex size-9 items-center justify-center rounded-lg", view === "list" && "bg-primary text-primary-foreground")}>
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Folders</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {folders.map((f) => {
                const count = documents.filter((d) => d.folderId === f.id).length;
                return (
                  <div key={f.id} className="flex items-center gap-1 rounded-xl border border-line bg-muted/40 px-2 py-1.5">
                    <button type="button" onClick={() => setFolderFilter(f.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Folder className="size-4 text-primary" /> {f.name}
                      <span className="text-xs text-ink-muted">({count})</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${f.name}`}
                      onClick={() => {
                        setFolderRenameId(f.id);
                        setFolderRenameValue(f.name);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${f.name}`} onClick={() => setDeleteFolderId(f.id)}>
                      <Trash2 className="size-3.5 text-danger" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Library ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <EmptyState icon={FileText} title="No documents" description="Try another search or upload a file for this session." />
              ) : view === "grid" ? (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(d.id)}
                        className={cn(
                          "flex h-full w-full flex-col gap-2 rounded-2xl border border-line p-4 text-left shadow-soft transition-colors hover:bg-muted/50",
                          selectedId === d.id && "border-primary ring-2 ring-primary/20",
                        )}
                      >
                        <FileText className="size-8 text-primary" />
                        <span className="line-clamp-2 text-sm font-bold text-ink">{d.name}</span>
                        <span className="text-xs text-ink-muted">
                          {DOCUMENT_CATEGORY_LABELS[d.category]} · {formatFileSize(d.size)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {filtered.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(d.id)}
                        className={cn("flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50", selectedId === d.id && "bg-primary/8")}
                      >
                        <FileText className="size-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{d.name}</span>
                          <span className="block text-xs text-ink-muted">
                            {DOCUMENT_CATEGORY_LABELS[d.category]} · {formatFileSize(d.size)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Storage (demo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {formatFileSize(DEMO_STORAGE_USED_BYTES)} of {formatFileSize(DEMO_STORAGE_TOTAL_BYTES)} used — illustrative only
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recent.map((d) => (
                <button key={d.id} type="button" onClick={() => setSelectedId(d.id)} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-sm hover:bg-muted/50">
                  <FileText className="size-4 text-primary" />
                  <span className="truncate font-semibold text-ink">{d.name}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm text-ink-muted">Select a document to view details.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-ink">{selected.name}</p>
                  <dl className="space-y-1 text-xs text-ink-muted">
                    <div className="flex justify-between gap-2">
                      <dt>Category</dt>
                      <dd className="font-semibold text-ink">{DOCUMENT_CATEGORY_LABELS[selected.category]}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Size</dt>
                      <dd className="font-semibold text-ink">{formatFileSize(selected.size)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Updated</dt>
                      <dd className="font-semibold text-ink">{new Date(selected.updatedAt).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                  {selected.isSessionUpload && selected.objectUrl ? (
                    selected.mime === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.objectUrl} alt={selected.name} className="mt-2 max-h-48 w-full rounded-xl object-contain bg-muted" />
                    ) : selected.mime === "pdf" ? (
                      <iframe title={selected.name} src={selected.objectUrl} className="mt-2 h-48 w-full rounded-xl border border-line" />
                    ) : (
                      <p className="text-sm text-ink-muted">Preview not available for this file type.</p>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-6 text-center text-sm text-ink-muted">
                      Preview placeholder — no permanent file is stored for mock library items.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenameId(selected.id);
                        setRenameValue(selected.name);
                      }}
                    >
                      <Pencil /> Rename
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMoveId(selected.id);
                        setMoveFolder(selected.folderId ?? "none");
                      }}
                    >
                      <Folder /> Move
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteDocId(selected.id)}>
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={addUploaded} />

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Creates a folder for this session only.</DialogDescription>
          </DialogHeader>
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newFolderName.trim()}
              onClick={() => {
                setFolders((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), name: newFolderName.trim(), createdAt: new Date().toISOString() },
                ]);
                setNewFolderName("");
                setNewFolderOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename doc */}
      <Dialog open={Boolean(renameId)} onOpenChange={(v) => !v && setRenameId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renameId) {
                  setDocuments((prev) =>
                    prev.map((d) => (d.id === renameId ? { ...d, name: renameValue.trim(), updatedAt: new Date().toISOString() } : d)),
                  );
                }
                setRenameId(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={Boolean(moveId)} onOpenChange={(v) => !v && setMoveId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <Select value={moveFolder} onValueChange={setMoveFolder}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No folder</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (moveId) {
                  setDocuments((prev) =>
                    prev.map((d) =>
                      d.id === moveId
                        ? { ...d, folderId: moveFolder === "none" ? null : moveFolder, updatedAt: new Date().toISOString() }
                        : d,
                    ),
                  );
                }
                setMoveId(null);
              }}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete doc */}
      <Dialog open={Boolean(deleteDocId)} onOpenChange={(v) => !v && setDeleteDocId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>Removes it from this session only.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDocId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDocuments((prev) => {
                  const doomed = prev.find((d) => d.id === deleteDocId);
                  if (doomed?.objectUrl) URL.revokeObjectURL(doomed.objectUrl);
                  return prev.filter((d) => d.id !== deleteDocId);
                });
                if (selectedId === deleteDocId) setSelectedId(null);
                setDeleteDocId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder */}
      <Dialog open={Boolean(folderRenameId)} onOpenChange={(v) => !v && setFolderRenameId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <Input value={folderRenameValue} onChange={(e) => setFolderRenameValue(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFolderRenameId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!folderRenameValue.trim()}
              onClick={() => {
                if (folderRenameId) {
                  setFolders((prev) => prev.map((f) => (f.id === folderRenameId ? { ...f, name: folderRenameValue.trim() } : f)));
                }
                setFolderRenameId(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder */}
      <Dialog open={Boolean(deleteFolderId)} onOpenChange={(v) => !v && setDeleteFolderId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>
              {documents.some((d) => d.folderId === deleteFolderId)
                ? "Move or delete documents in this folder first."
                : "This empty folder will be removed from the session."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteFolderId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={documents.some((d) => d.folderId === deleteFolderId)}
              onClick={() => {
                setFolders((prev) => prev.filter((f) => f.id !== deleteFolderId));
                if (folderFilter === deleteFolderId) setFolderFilter("all");
                setDeleteFolderId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: (file: File) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open ? <UploadDialogBody key="upload" onUploaded={onUploaded} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function UploadDialogBody({ onUploaded, onClose }: { onUploaded: (file: File) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const runUpload = (file: File) => {
    setError(undefined);
    setDone(false);
    setProgress(0);
    let p = 0;
    const tick = window.setInterval(() => {
      p += 18;
      if (p >= 100) {
        window.clearInterval(tick);
        setProgress(100);
        try {
          onUploaded(file);
          setDone(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed.");
          setProgress(null);
        }
      } else setProgress(p);
    }, 120);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload document</DialogTitle>
        <DialogDescription>Demo only — the file stays in this browser session and is not stored on a server.</DialogDescription>
      </DialogHeader>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) runUpload(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-line bg-muted/30",
        )}
      >
        <Upload className="size-8 text-primary" />
        <span className="text-sm font-semibold text-ink">Drag & drop or click to browse</span>
        <span className="text-xs text-ink-muted">PDF, images, DOC/DOCX · max 10 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={ALLOWED_EXT.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) runUpload(file);
          e.target.value = "";
        }}
      />
      {progress !== null && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-muted">{done ? "Added to library for this session." : `Uploading… ${progress}%`}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {done ? "Done" : "Close"}
        </Button>
      </DialogFooter>
    </>
  );
}
