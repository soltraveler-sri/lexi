"use client";

import { Chrome } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function continueWithGoogle() {
    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-semibold text-text">Forge</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            A private writing workspace for line-by-line rewrites and a growing voice
            profile.
          </p>
        </div>
        <Button className="w-full" onClick={continueWithGoogle}>
          <Chrome className="h-4 w-4" />
          Continue with Google
        </Button>
      </section>
    </main>
  );
}
