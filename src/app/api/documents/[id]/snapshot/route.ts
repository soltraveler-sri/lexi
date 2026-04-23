import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isTipTapDocument,
  notFound,
  readJsonObject,
  readNumber,
  unauthorized,
} from "@/lib/api";
import * as documentsRepo from "@/lib/db/repos/documents";
import { countWords, tipTapToText } from "@/lib/style/export";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const document = await documentsRepo.getById(user.id, params.id);

  if (!document) {
    return notFound();
  }

  const body = await readJsonObject(request);

  if (!body || !isTipTapDocument(body.content)) {
    return badRequest("content_required");
  }

  const snapshot = await documentsRepo.createSnapshot({
    userId: user.id,
    documentId: params.id,
    content: body.content,
    wordCount: readNumber(body, "wordCount", countWords(tipTapToText(body.content))),
  });

  return NextResponse.json({ snapshot }, { status: 201 });
}
