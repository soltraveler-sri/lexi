import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  isStyleEventType,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  readStringArray,
  unauthorized,
} from "@/lib/api";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const events = await styleEventsRepo.listForUser(user.id);
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body || !isStyleEventType(body.eventType)) {
    return badRequest("event_type_required");
  }

  const event = await styleEventsRepo.create({
    userId: user.id,
    documentId: readOptionalString(body, "documentId"),
    eventType: body.eventType,
    beforeText: readString(body, "beforeText"),
    afterText: readString(body, "afterText"),
    surroundingBefore: readString(body, "surroundingBefore"),
    surroundingAfter: readString(body, "surroundingAfter"),
    documentType: readString(body, "documentType", "blog_post"),
    voiceContext: readString(body, "voiceContext", "universal"),
    editTags: readStringArray(body, "editTags"),
    note: readOptionalString(body, "note"),
    aiPrompt: readOptionalString(body, "aiPrompt"),
    aiProvider: readOptionalString(body, "aiProvider"),
    agentId: readOptionalString(body, "agentId"),
    timeSpentMs: readNumber(body, "timeSpentMs", 0),
  });

  return NextResponse.json({ event }, { status: 201 });
}
