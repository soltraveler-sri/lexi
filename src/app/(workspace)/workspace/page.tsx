import { NewDocumentButton } from "@/components/library/NewDocumentButton";

export default function WorkspacePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-10">
      <section className="max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint">
          Begin
        </p>
        <h1 className="mt-3 font-display text-[44px] font-normal leading-[1.05] tracking-tight text-text">
          A blank entry, awaiting yours.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-text-muted">
          Lexi keeps your pages, learns the lexicon of how you sound, and helps
          you rewrite a sentence the way you would on a better day.
        </p>
        <div className="mt-7 max-w-[220px]">
          <NewDocumentButton />
        </div>
      </section>
    </main>
  );
}
