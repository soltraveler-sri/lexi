import { redirect } from "next/navigation";

import { Sidebar } from "@/components/library/Sidebar";
import * as documentsRepo from "@/lib/db/repos/documents";
import * as projectsRepo from "@/lib/db/repos/projects";
import { getUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const [projects, documents] = await Promise.all([
    projectsRepo.listForUser(user.id),
    documentsRepo.listForUser(user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar
        documents={documents.map((document) => ({
          id: document.id,
          title: document.title,
          projectId: document.projectId,
          updatedAt: document.updatedAt.toISOString(),
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
        }))}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
