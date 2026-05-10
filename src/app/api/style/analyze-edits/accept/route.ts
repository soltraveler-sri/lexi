import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readString,
  unauthorized,
} from "@/lib/api";
import * as preferencesRepo from "@/lib/db/repos/preferences";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);
  if (!body) {
    return badRequest("invalid_json");
  }

  const statement = readString(body, "statement").trim();
  if (!statement) {
    return badRequest("statement_required");
  }

  const existing = await preferencesRepo.getForUser(user.id);
  const existingContent = existing?.content?.trim() ?? "";

  // Append as a markdown bullet so the preferences block stays readable. If
  // the existing content is empty we just write the statement directly.
  const next = existingContent
    ? `${existingContent}\n- ${statement}`
    : `- ${statement}`;

  await preferencesRepo.update(user.id, next);

  return NextResponse.json({ ok: true });
}
