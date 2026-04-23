import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  readStringArray,
  unauthorized,
} from "@/lib/api";
import * as exemplarsRepo from "@/lib/db/repos/exemplars";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const exemplars = await exemplarsRepo.listForUser(user.id);
  return NextResponse.json({ exemplars });
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

  const documentId = readString(body, "documentId");
  const textSnapshot = readString(body, "textSnapshot");

  if (!documentId || !textSnapshot) {
    return badRequest("document_id_and_text_required");
  }

  const exemplar = await exemplarsRepo.create({
    userId: user.id,
    documentId,
    fromPos: readNumber(body, "fromPos", 0),
    toPos: readNumber(body, "toPos", 0),
    textSnapshot,
    tags: readStringArray(body, "tags"),
    note: readOptionalString(body, "note"),
  });

  return NextResponse.json({ exemplar }, { status: 201 });
}
