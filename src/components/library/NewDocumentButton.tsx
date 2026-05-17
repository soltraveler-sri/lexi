"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function NewDocumentButton() {
  const router = useRouter();

  async function createDocument() {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    const payload = (await response.json()) as { document?: { id: string } };

    if (payload.document) {
      router.push(`/workspace/${payload.document.id}`);
      router.refresh();
    }
  }

  return (
    <Button
      className="w-full justify-start gap-2 text-text"
      onClick={() => void createDocument()}
      variant="secondary"
    >
      <Plus className="h-4 w-4 text-text-muted" />
      New entry
    </Button>
  );
}
