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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 font-display text-2xl font-semibold">{title}</h2>
      {children}
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
    <main className="min-h-screen bg-bg px-12 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <h1 className="font-display text-5xl font-semibold">Settings</h1>
        </header>
        <div className="space-y-5">
          <Section title="Rewrite renderer">
            <RendererModeSelector value={settings.rendererMode} />
          </Section>
          <Section title="Voice Profile">
            <SettingsToggles
              alwaysSendFullVoiceProfile={settings.alwaysSendFullVoiceProfile}
              editTagToastEnabled={settings.editTagToastEnabled}
            />
          </Section>
          <Section title="AI providers">
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
          <Section title="Usage">
            <UsageOverview events={usageEvents} />
          </Section>
          <Section title="Export & data">
            <ExportPanel />
          </Section>
          <Section title="About">
            <div className="space-y-1 text-sm text-text-muted">
              <p>Lexi / Forge MVP 0.1.0</p>
              <a
                className="text-accent-hover hover:underline"
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
