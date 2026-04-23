import { NextResponse } from "next/server";

import {
  badRequest,
  getApiUser,
  readJsonObject,
  readNumber,
  readOptionalString,
  readString,
  unauthorized,
} from "@/lib/api";
import * as projectsRepo from "@/lib/db/repos/projects";

export async function GET() {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const projects = await projectsRepo.listForUser(user.id);
  return NextResponse.json({ projects });
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

  const project = await projectsRepo.create({
    userId: user.id,
    name: readString(body, "name", "Untitled project"),
    description: readOptionalString(body, "description"),
    sortOrder: readNumber(body, "sortOrder", 0),
  });

  return NextResponse.json({ project }, { status: 201 });
}
