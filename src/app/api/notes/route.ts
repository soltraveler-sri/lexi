import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readString,
  unauthorized,
} from "@/lib/api";
import * as notesRepo from "@/lib/db/repos/notes";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }
  const note = await notesRepo.getForUser(user.id);
  return NextResponse.json({ note });
}

export async function PUT(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);
  if (!body) {
    return badRequest("invalid_json");
  }

  const content = readString(body, "content");
  const note = await notesRepo.upsertForUser(user.id, content);
  return NextResponse.json({ note });
}
