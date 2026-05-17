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
    <section className="w-full max-w-[420px]">
      <div className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint">
          A writing workspace
        </p>
        <h1 className="mt-3 inline-flex items-baseline gap-2 font-display text-[88px] font-normal leading-none tracking-tight text-accent">
          lexi
          <span className="font-display text-[22px] italic font-normal text-text-faint">
            n.
          </span>
        </h1>
        <p className="mt-6 max-w-sm text-sm leading-6 text-text-muted">
          A private place to write, with line-by-line rewrites in your voice and
          a slow record of the lexicon you actually use.
        </p>
      </div>
      {error === "not_allowed" ? (
        <p className="mb-6 border-l-2 border-accent-2 bg-accent-2-soft/40 px-4 py-3 text-sm leading-6 text-text-muted">
          This deployment is restricted to specific accounts. Lexi is open
          source — run it locally with your own keys at{" "}
          <a
            className="text-accent underline underline-offset-2"
            href="https://github.com/soltraveler-sri/lexi"
            rel="noreferrer"
            target="_blank"
          >
            github.com/soltraveler-sri/lexi
          </a>
          .
        </p>
      ) : null}
      <Button className="w-fit" onClick={continueWithGoogle}>
        <Chrome className="h-4 w-4" />
        Continue with Google
      </Button>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center bg-bg px-12">
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
