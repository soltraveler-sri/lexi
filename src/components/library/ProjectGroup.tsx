"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { DocumentRow, type LibraryDocument } from "@/components/library/DocumentRow";
import { cn } from "@/lib/utils";

export interface LibraryProject {
  id: string;
  name: string;
}

export function ProjectGroup({
  project,
  documents,
  activeDocumentId,
  onRenameDocument,
  onDeleteDocument,
}: {
  project: LibraryProject | null;
  documents: LibraryDocument[];
  activeDocumentId: string | null;
  onRenameDocument: (id: string, title: string) => void;
  onDeleteDocument: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mb-4">
      <button
        className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-on-chrome-muted transition-colors hover:text-text-on-chrome"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 text-text-on-chrome-faint transition-transform",
            !open && "-rotate-90",
          )}
        />
        <span className="truncate">{project?.name ?? "Unsorted"}</span>
      </button>
      {open ? (
        <div className="mt-1 space-y-0.5">
          {documents.map((document) => (
            <DocumentRow
              active={activeDocumentId === document.id}
              document={document}
              key={document.id}
              onDelete={onDeleteDocument}
              onRename={onRenameDocument}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
