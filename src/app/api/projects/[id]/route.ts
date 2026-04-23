import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  notFound,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  unauthorized,
} from "@/lib/api";
import * as projectsRepo from "@/lib/db/repos/projects";
import type { ProjectUpdate } from "@/lib/db/repos/projects";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body) {
    return badRequest("invalid_json");
  }

  const values: ProjectUpdate = {};

  if ("name" in body) {
    values.name = readString(body, "name", "Untitled project");
  }

  if ("description" in body) {
    values.description = readOptionalString(body, "description");
  }

  if ("sortOrder" in body) {
    values.sortOrder = readNumber(body, "sortOrder", 0);
  }

  const project = await projectsRepo.update(user.id, params.id, values);

  if (!project) {
    return notFound();
  }

  return NextResponse.json({ project });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const project = await projectsRepo.remove(user.id, params.id);

  if (!project) {
    return notFound();
  }

  return NextResponse.json({ project });
}
