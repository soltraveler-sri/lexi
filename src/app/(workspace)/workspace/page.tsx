import { FileText } from "lucide-react";

import { NewDocumentButton } from "@/components/library/NewDocumentButton";

export default function WorkspacePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-10">
      <section className="max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-surface shadow-md">
          <FileText className="h-9 w-9 text-accent" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-text">
          Create your first document.
        </h1>
        <div className="mx-auto mt-6 max-w-52">
          <NewDocumentButton />
        </div>
      </section>
    </main>
  );
}
