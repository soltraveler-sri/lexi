"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ExternalLink, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceDate?: string;
}

export function AdHocResearch({
  open,
  onOpenChange,
  editor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryUsed, setQueryUsed] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            results?: ResearchResult[];
            queryUsed?: string;
            provider?: string;
            message?: string;
            error?: string;
          }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "Web search failed.");
        setResults([]);
        return;
      }

      setResults(payload?.results ?? []);
      setQueryUsed(payload?.queryUsed ?? trimmed);
      setProvider(payload?.provider ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Web search failed.");
    } finally {
      setLoading(false);
    }
  }

  function copyLink(url: string) {
    void navigator.clipboard?.writeText(url);
  }

  function insertAsLink(result: ResearchResult) {
    if (!editor) {
      return;
    }
    const label = result.title || result.url;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: label,
        marks: [{ type: "link", attrs: { href: result.url } }],
      })
      .run();
  }

  function insertAsQuote(result: ResearchResult) {
    if (!editor) {
      return;
    }
    const dateSuffix = result.sourceDate ? ` (${result.sourceDate})` : "";
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: result.title || result.url }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `Source${dateSuffix}: `,
            },
            {
              type: "text",
              text: result.url,
              marks: [{ type: "link", attrs: { href: result.url } }],
            },
          ],
        },
      ])
      .run();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ad-hoc research</DialogTitle>
        </DialogHeader>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <Input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to look up?"
            value={query}
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            <Search className="h-4 w-4" />
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {queryUsed && !error ? (
          <p className="text-xs text-text-faint">
            via {provider ?? "web search"} — {queryUsed}
          </p>
        ) : null}
        <div className="max-h-[460px] overflow-y-auto rounded-sm border border-border">
          {results.length === 0 && !loading && !error ? (
            <p className="px-3 py-6 text-center text-sm text-text-faint">
              Run a query to see sources.
            </p>
          ) : null}
          <ul className="divide-y divide-border">
            {results.map((result) => (
              <li className="px-3 py-3" key={result.url}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <a
                    className="text-sm font-medium text-accent-hover hover:underline"
                    href={result.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {result.title || result.url}
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                  {result.sourceDate ? (
                    <span className="text-xs text-text-faint">{result.sourceDate}</span>
                  ) : null}
                </div>
                <p className="mb-2 break-all text-xs text-text-muted">{result.url}</p>
                {result.snippet ? (
                  <p className="mb-2 text-sm text-text-muted">{result.snippet}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => copyLink(result.url)}
                    size="sm"
                    variant="ghost"
                  >
                    Copy link
                  </Button>
                  {editor ? (
                    <>
                      <Button
                        onClick={() => insertAsLink(result)}
                        size="sm"
                        variant="secondary"
                      >
                        Insert as link
                      </Button>
                      <Button
                        onClick={() => insertAsQuote(result)}
                        size="sm"
                        variant="secondary"
                      >
                        Insert as quote
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
