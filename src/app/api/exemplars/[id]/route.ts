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
import * as exemplarsRepo from "@/lib/db/repos/exemplars";
import type { ExemplarUpdate } from "@/lib/db/repos/exemplars";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const values: ExemplarUpdate = {};

  if ("tags" in body) {
    values.tags = readStringArray(body, "tags");
  }

  if ("note" in body) {
    values.note = readOptionalString(body, "note");
  }

  const exemplar = await exemplarsRepo.update(user.id, params.id, values);

  if (!exemplar) {
    return notFound();
  }

  return NextResponse.json({ exemplar });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const exemplar = await exemplarsRepo.remove(user.id, params.id);

  if (!exemplar) {
    return notFound();
  }

  return NextResponse.json({ exemplar });
}
