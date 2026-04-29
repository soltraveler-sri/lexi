"use client";

import { Chrome } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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
    <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-lg">
      <div className="mb-8 text-center">
        <h1 className="font-display text-5xl font-semibold text-text">lexi</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          A private writing workspace for line-by-line rewrites and a growing voice
          profile.
        </p>
      </div>
      {error === "not_allowed" ? (
        <p className="mb-4 rounded-md border border-border bg-bg p-3 text-sm leading-6 text-text-muted">
          This deployment is restricted to specific accounts. lexi is open
          source — you can run it locally with your own API keys. Get the code
          at{" "}
          <a
            href="https://github.com/soltraveler-sri/lexi"
            target="_blank"
            rel="noreferrer"
            className="text-text underline underline-offset-2"
          >
            github.com/soltraveler-sri/lexi
          </a>
          .
        </p>
      ) : null}
      <Button className="w-full" onClick={continueWithGoogle}>
        <Chrome className="h-4 w-4" />
        Continue with Google
      </Button>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
