import { NextResponse } from "next/server";

import { getApiUser, notFound, unauthorized } from "@/lib/api";
import * as documentsRepo from "@/lib/db/repos/documents";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const document = await documentsRepo.getById(user.id, params.id);

  if (!document) {
    return notFound();
  }

  const snapshots = await documentsRepo.listSnapshots(user.id, params.id);
  return NextResponse.json({ snapshots });
}
