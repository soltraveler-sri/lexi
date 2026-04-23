import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readString,
  unauthorized,
} from "@/lib/api";
import * as preferencesRepo from "@/lib/db/repos/preferences";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const preference =
    (await preferencesRepo.getForUser(user.id)) ??
    (await preferencesRepo.create({ userId: user.id }));

  return NextResponse.json({ preference });
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

  const preference = await preferencesRepo.update(user.id, readString(body, "content"));

  return NextResponse.json({ preference });
}
