import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  notFound,
  readJsonObject,
  readOptionalString,
  readStringArray,
  unauthorized,
} from "@/lib/api";
import * as styleEventsRepo from "@/lib/db/repos/styleEvents";
import type { StyleEventUpdate } from "@/lib/db/repos/styleEvents";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const values: StyleEventUpdate = {};

  if ("editTags" in body) {
    values.editTags = readStringArray(body, "editTags");
  }

  if ("note" in body) {
    values.note = readOptionalString(body, "note");
  }

  const event = await styleEventsRepo.update(user.id, params.id, values);

  if (!event) {
    return notFound();
  }

  return NextResponse.json({ event });
}
