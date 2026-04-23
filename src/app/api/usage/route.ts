import { NextResponse, type NextRequest } from "next/server";

import { getApiUser, unauthorized } from "@/lib/api";
import * as usageRepo from "@/lib/db/repos/usage";

export async function GET(request: NextRequest) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  const period = request.nextUrl.searchParams.get("period");
  const events =
    period === "current_month"
      ? await usageRepo.listCurrentMonthForUser(user.id)
      : await usageRepo.listForUser(user.id);

  return NextResponse.json({ events });
}
