import { Readable, PassThrough } from "node:stream";
import archiver from "archiver";

import { getApiUser, unauthorized } from "@/lib/api";
import * as documentsRepo from "@/lib/db/repos/documents";
import * as exemplarsRepo from "@/lib/db/repos/exemplars";
import * as preferencesRepo from "@/lib/db/repos/preferences";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";
import { tipTapToMarkdown } from "@/lib/style/export";

export const runtime = "nodejs";

function jsonl(rows: unknown[]) {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const [documents, events, exemplars, preferences] = await Promise.all([
    documentsRepo.listIncludedForStyleProfile(user.id),
    styleEventsRepo.listForUser(user.id, 10000),
    exemplarsRepo.listForUser(user.id),
    preferencesRepo.getForUser(user.id),
  ]);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  const works = documents.map((document) => ({
    id: document.id,
    title: document.title,
    type: document.type,
    voice_context: document.voiceContext,
    tags: document.tags,
    markdown: tipTapToMarkdown(document.content),
    word_count: document.wordCount,
    created_at: document.createdAt.toISOString(),
    updated_at: document.updatedAt.toISOString(),
  }));

  const brainDumps = documents
    .filter((document) => document.type === "brain_dump")
    .map((document) => ({
      brain_dump: {
        id: document.id,
        title: document.title,
        markdown: tipTapToMarkdown(document.content),
      },
      outputs: documents
        .filter((candidate) => candidate.sourceDocumentId === document.id)
        .map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          markdown: tipTapToMarkdown(candidate.content),
        })),
    }));

  archive.append(jsonl(works), { name: "works.jsonl" });
  archive.append(
    jsonl(
      events.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    ),
    { name: "edits.jsonl" },
  );
  archive.append(
    jsonl(
      exemplars.map((exemplar) => ({
        ...exemplar,
        createdAt: exemplar.createdAt.toISOString(),
      })),
    ),
    { name: "exemplars.jsonl" },
  );
  archive.append(preferences?.content ?? "", { name: "preferences.md" });
  archive.append(jsonl(brainDumps), { name: "brain_dumps.jsonl" });
  archive.append(
    [
      "# lexi training export",
      "",
      "works.jsonl: documents marked for style profile inclusion.",
      "edits.jsonl: captured rewrite and AI suggestion events.",
      "exemplars.jsonl: selected exemplar passages.",
      "preferences.md: freeform style preferences.",
      "brain_dumps.jsonl: brain-dump documents paired with linked outputs.",
    ].join("\n"),
    { name: "README.md" },
  );

  void archive.finalize();

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="lexi-training-export.zip"',
    },
  });
}
