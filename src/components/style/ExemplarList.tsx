"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ExemplarListItem {
  id: string;
  documentId: string;
  textSnapshot: string;
  tags: string[];
  note: string | null;
}

export function ExemplarList({ exemplars }: { exemplars: ExemplarListItem[] }) {
  const router = useRouter();

  async function remove(id: string) {
    await fetch(`/api/exemplars/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (!exemplars.length) {
    return <p className="text-sm text-text-muted">No exemplars marked yet.</p>;
  }

  return (
    <div className="space-y-3">
      {exemplars.map((exemplar) => (
        <article
          className="rounded-md border border-border bg-surface p-4 shadow-sm"
          key={exemplar.id}
        >
          <div className="flex items-start justify-between gap-4">
            <Link
              className="font-display text-lg leading-7 hover:text-accent-hover"
              href={`/workspace/${exemplar.documentId}`}
            >
              {exemplar.textSnapshot.slice(0, 220)}
            </Link>
            <Button
              onClick={() => void remove(exemplar.id)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {exemplar.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {exemplar.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          ) : null}
          {exemplar.note ? (
            <p className="mt-2 text-sm text-text-muted">{exemplar.note}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
