import { JournalNav } from "@/components/journal/JournalNav";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <main className="min-h-screen bg-bg px-12 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wide text-text-faint">Lexi</p>
          <h1 className="mt-1 font-display text-5xl font-semibold text-text">Journal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Home base for your writing identity — preferences, exemplars,
            agents, reflections, and meta-notes. Calmer than your inbox; more
            durable than a slack channel.
          </p>
          <JournalNav />
        </header>
        {children}
      </div>
    </main>
  );
}
