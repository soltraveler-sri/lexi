import { redirect } from "next/navigation";

import { ensureForUser } from "@/lib/db/repos/settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  await ensureForUser(user.id);

  return user;
}

export async function requireUser() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
