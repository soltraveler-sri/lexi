import { AIProviderList } from "@/components/settings/AIProviderList";
import { ExportPanel } from "@/components/settings/ExportPanel";
import { RendererModeSelector } from "@/components/settings/RendererModeSelector";
import { SettingsToggles } from "@/components/settings/SettingsToggles";
import { UsageOverview } from "@/components/settings/UsageOverview";
import * as credentialsRepo from "@/lib/db/repos/credentials";
import * as settingsRepo from "@/lib/db/repos/settings";
import * as usageRepo from "@/lib/db/repos/usage";
import { requireUser } from "@/lib/auth/getUser";

export const dynamic = "force-dynamic";

function Section({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-x-10 gap-y-4 border-t border-border pt-10 md:grid-cols-[260px_1fr]">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint">
          {index}
        </p>
        <h2 className="font-display text-[26px] font-normal leading-tight text-text">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-text-muted">{description}</p>
        ) : null}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, credentials, usageEvents] = await Promise.all([
    settingsRepo.ensureForUser(user.id),
    credentialsRepo.listForUser(user.id),
    usageRepo.listCurrentMonthForUser(user.id),
  ]);

  return (
    <main className="min-h-screen bg-bg px-12 py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint">
            Lexi
          </p>
          <h1 className="mt-2 font-display text-[52px] font-normal leading-none tracking-tight text-text">
            Settings
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-text-muted">
            The colophon — how the workshop is configured. Provider keys,
            rendering, exports, and what gets sent to the model.
          </p>
        </header>
        <div className="space-y-12">
          <Section
            description="Where the rewrite appears when you act on a selection — beside the prose, or in an overlay."
            index="§ 01"
            title="Rewrite renderer"
          >
            <RendererModeSelector value={settings.rendererMode} />
          </Section>
          <Section
            description="What Lexi knows about you, and what gets attached to each request."
            index="§ 02"
            title="Voice profile"
          >
            <SettingsToggles
              alwaysSendFullVoiceProfile={settings.alwaysSendFullVoiceProfile}
              editTagToastEnabled={settings.editTagToastEnabled}
            />
          </Section>
          <Section
            description="Personal API keys are encrypted at rest. App-owned keys fall back when you haven't added one."
            index="§ 03"
            title="AI providers"
          >
            <AIProviderList
              credentials={credentials.map((credential) => ({
                id: credential.id,
                provider: credential.provider,
                label: credential.label,
                isDefault: credential.isDefault,
                ownership: credential.ownership,
              }))}
            />
          </Section>
          <Section
            description="This month's tokens, by provider and request kind."
            index="§ 04"
            title="Usage"
          >
            <UsageOverview events={usageEvents} />
          </Section>
          <Section
            description="Bundle your documents, exemplars, and voice profile as a training-ready zip."
            index="§ 05"
            title="Export & data"
          >
            <ExportPanel />
          </Section>
          <Section index="§ 06" title="About">
            <div className="space-y-1 text-sm text-text-muted">
              <p>lexi · 0.1.0</p>
              <a
                className="text-accent hover:underline"
                href="https://github.com/soltraveler-sri/lexi/blob/main/README.md"
              >
                README
              </a>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
