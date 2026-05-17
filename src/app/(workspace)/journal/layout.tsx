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
    <main className="min-h-screen bg-bg px-12 py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Lexi
          </p>
          <h1 className="mt-2 font-display text-[52px] font-normal leading-none tracking-tight text-text">
            Journal
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-text-muted">
            The back rooms of the workshop. Voice, exemplars, agents, marginalia,
            and the slow record of how you sound — kept here so the page stays
            for the page.
          </p>
        </header>
        <JournalNav />
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}
