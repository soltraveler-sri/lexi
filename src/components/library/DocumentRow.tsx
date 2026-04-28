"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

export interface LibraryDocument {
  id: string;
  title: string;
  projectId: string | null;
  updatedAt: string;
}

export function DocumentRow({
  document,
  active,
  onRename,
  onDelete,
}: {
  document: LibraryDocument;
  active: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center rounded-sm">
      <Link
        className={`min-w-0 flex-1 rounded-sm px-2 py-1.5 text-sm transition-colors ${
          active ? "bg-accent-soft text-text" : "hover:bg-surface-sunken"
        }`}
        href={`/workspace/${document.id}`}
      >
        <div className="truncate">{document.title || "Untitled"}</div>
        <div className="truncate text-xs text-text-faint">
          {formatDate(document.updatedAt)}
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="mr-1 hidden h-7 w-7 items-center justify-center rounded-sm text-text-faint hover:bg-surface group-hover:flex">
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              const title = window.prompt("Document title", document.title);
              if (title) {
                onRename(document.id, title);
              }
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              const link = window.document.createElement("a");
              link.href = `/api/documents/${document.id}/download?format=md`;
              link.rel = "noopener";
              link.click();
            }}
          >
            Download .md
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              const link = window.document.createElement("a");
              link.href = `/api/documents/${document.id}/download?format=docx`;
              link.rel = "noopener";
              link.click();
            }}
          >
            Download .docx
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(document.id)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
