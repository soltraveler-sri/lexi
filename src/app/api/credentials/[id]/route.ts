import { NextResponse } from "next/server";

import { getApiUser, notFound, unauthorized } from "@/lib/api";
import * as credentialsRepo from "@/lib/db/repos/credentials";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const credential = await credentialsRepo.remove(user.id, params.id);

  if (!credential) {
    return notFound();
  }

  return NextResponse.json({
    credential: { ...credential, apiKey: "••••••••" },
  });
}
