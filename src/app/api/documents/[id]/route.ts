import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isDocumentType,
  isTipTapDocument,
  isVoiceContext,
  notFound,
  readBoolean,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  readStringArray,
  unauthorized,
} from "@/lib/api";
import * as documentsRepo from "@/lib/db/repos/documents";
import type { DocumentUpdate } from "@/lib/db/repos/documents";
import { countWords, tipTapToText } from "@/lib/style/export";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const document = await documentsRepo.getById(user.id, params.id);

  if (!document) {
    return notFound();
  }

  return NextResponse.json({ document });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const values: DocumentUpdate = {};

  if ("title" in body) {
    values.title = readString(body, "title", "Untitled");
  }

  if ("projectId" in body) {
    values.projectId = readOptionalString(body, "projectId");
  }

  if ("content" in body && isTipTapDocument(body.content)) {
    values.content = body.content;
    values.wordCount = countWords(tipTapToText(body.content));
  }

  if ("type" in body && isDocumentType(body.type)) {
    values.type = body.type;
  }

  if ("voiceContext" in body && isVoiceContext(body.voiceContext)) {
    values.voiceContext = body.voiceContext;
  }

  if ("includeInStyleProfile" in body) {
    values.includeInStyleProfile = readBoolean(body, "includeInStyleProfile", true);
  }

  if ("tags" in body) {
    values.tags = readStringArray(body, "tags");
  }

  if ("sourceDocumentId" in body) {
    values.sourceDocumentId = readOptionalString(body, "sourceDocumentId");
  }

  if ("wordCount" in body) {
    values.wordCount = readNumber(body, "wordCount", values.wordCount ?? 0);
  }

  const document = await documentsRepo.update(user.id, params.id, values);

  if (!document) {
    return notFound();
  }

  return NextResponse.json({ document });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const document = await documentsRepo.remove(user.id, params.id);

  if (!document) {
    return notFound();
  }

  return NextResponse.json({ document });
}
