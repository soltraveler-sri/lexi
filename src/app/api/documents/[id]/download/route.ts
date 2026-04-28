import { Readable } from "node:stream";

import { type NextRequest } from "next/server";

import { getApiUser, notFound, unauthorized } from "@/lib/api";
import * as documentsRepo from "@/lib/db/repos/documents";
import { buildDocxStream } from "@/lib/style/docx";
import { tipTapToMarkdown } from "@/lib/style/export";

export const runtime = "nodejs";

function safeFilename(title: string, ext: string) {
  const cleaned =
    title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "document";

  return `${cleaned}.${ext}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const document = await documentsRepo.getById(user.id, params.id);

  if (!document) {
    return notFound();
  }

  const format = (request.nextUrl.searchParams.get("format") ?? "md").toLowerCase();

  if (format === "md" || format === "markdown") {
    const body = `# ${document.title}\n\n${tipTapToMarkdown(document.content)}\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename(document.title, "md")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "docx") {
    const { stream } = buildDocxStream(document.content, document.title);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFilename(document.title, "docx")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new Response(JSON.stringify({ error: "unsupported_format" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
