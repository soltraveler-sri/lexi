"use client";

import Link from "next/link";
import { BookOpen, LogOut, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { NewDocumentButton } from "@/components/library/NewDocumentButton";
import { ProjectGroup, type LibraryProject } from "@/components/library/ProjectGroup";
import type { LibraryDocument } from "@/components/library/DocumentRow";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Sidebar({
  projects,
  documents,
}: {
  projects: LibraryProject[];
  documents: LibraryDocument[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen } = useWorkspaceStore();
  const activeDocumentId = pathname.startsWith("/workspace/")
    ? (pathname.split("/").at(-1) ?? null)
    : null;

  async function renameDocument(id: string, title: string) {
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    router.refresh();
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("Delete this document?")) {
      return;
    }

    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (activeDocumentId === id) {
      router.push("/workspace");
    }
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!sidebarOpen) {
    return null;
  }

  const grouped = projects.map((project) => ({
    project,
    documents: documents.filter((document) => document.projectId === project.id),
  }));
  const unsorted = documents.filter((document) => !document.projectId);

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-border bg-bg-sidebar">
      <div className="p-5">
        <Link className="mb-6 flex items-center gap-2" href="/workspace">
          <span className="font-display text-[28px] font-semibold leading-none">
            lexi
          </span>
          <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
        </Link>
        <NewDocumentButton />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {grouped.map(({ project, documents: projectDocuments }) => (
          <ProjectGroup
            activeDocumentId={activeDocumentId}
            documents={projectDocuments}
            key={project.id}
            onDeleteDocument={(id) => void deleteDocument(id)}
            onRenameDocument={(id, title) => void renameDocument(id, title)}
            project={project}
          />
        ))}
        <ProjectGroup
          activeDocumentId={activeDocumentId}
          documents={unsorted}
          onDeleteDocument={(id) => void deleteDocument(id)}
          onRenameDocument={(id, title) => void renameDocument(id, title)}
          project={null}
        />
      </div>
      <footer className="flex items-center justify-between border-t border-border p-3">
        <Button asChild size="icon" title="Journal" variant="ghost">
          <Link href="/journal/style-guide">
            <BookOpen className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="icon" title="Settings" variant="ghost">
          <Link href="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          onClick={() => void signOut()}
          size="icon"
          title="Sign out"
          variant="ghost"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </footer>
    </aside>
  );
}
