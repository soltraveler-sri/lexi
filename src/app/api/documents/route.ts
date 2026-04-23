import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isDocumentType,
  isTipTapDocument,
  isVoiceContext,
  readBoolean,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  readStringArray,
  unauthorized,
} from "@/lib/api";
import * as documentsRepo from "@/lib/db/repos/documents";
import { countWords, tipTapToText } from "@/lib/style/export";
import { emptyTipTapDocument } from "@/types";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const documents = await documentsRepo.listForUser(user.id);
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const content = isTipTapDocument(body.content) ? body.content : emptyTipTapDocument;
  const text = tipTapToText(content);
  const type = isDocumentType(body.type) ? body.type : "blog_post";
  const voiceContext = isVoiceContext(body.voiceContext)
    ? body.voiceContext
    : "universal";

  const document = await documentsRepo.create({
    userId: user.id,
    title: readString(body, "title", "Untitled"),
    projectId: readOptionalString(body, "projectId"),
    content,
    type,
    voiceContext,
    includeInStyleProfile: readBoolean(body, "includeInStyleProfile", true),
    tags: readStringArray(body, "tags"),
    sourceDocumentId: readOptionalString(body, "sourceDocumentId"),
    wordCount: readNumber(body, "wordCount", countWords(text)),
  });

  return NextResponse.json({ document }, { status: 201 });
}
