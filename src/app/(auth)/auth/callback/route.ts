import { NextResponse, type NextRequest } from "next/server";

import { ensureForUser } from "@/lib/db/repos/settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/workspace";

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createServerSupabaseClient();
  await supabase.auth.exchangeCodeForSession(code);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureForUser(user.id);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
