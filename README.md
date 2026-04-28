# Lexi

Lexi is a private cloud writing application for a writer whose workflow centers on line-by-line manual rewrites of AI-produced drafts. The MVP ships one core feature, the Rewrite Strip, so selected prose can be replaced in a focused strip while the original remains locked and visible.

The application also captures style-learning data in the background. Preferences, exemplars, and before/after rewrite pairs form a Style Profile that is ready for future AI transforms, hosted model access, agent workflows, and multi-user SaaS without changing the core schema.

## Architecture

```mermaid
flowchart LR
  Browser["Next.js App Router UI"] --> Routes["/api route handlers"]
  Routes --> Repos["Typed Drizzle repos"]
  Repos --> Supabase["Supabase Postgres + RLS"]
  Browser --> Auth["Supabase Auth Google OAuth"]
  Routes --> Export["Training zip export"]
  Routes --> AI["AI resolver + provider registry"]
  AI --> BYOK["user_credentials ownership=user"]
  AI --> Usage["usage_events"]
```

## Quickstart

1. Create a Supabase project.
2. Enable Google OAuth in Supabase Auth and add your Vercel/local callback URL: `/auth/callback`.
3. Apply migrations in order: `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_usage_events_ownership.sql`.
4. Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, and `DATABASE_URL`.
5. (Optional) Set `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` to enable AI features without per-user BYOK keys. Set `LEXI_RATE_LIMIT_ALLOWLIST_EMAILS` to bypass MVP rate limits for operator accounts.
6. Set the same env vars in Vercel.
7. Connect `https://github.com/soltraveler-sri/lexi` to Vercel and deploy.

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Add A Transform

Transforms are declared in `src/lib/transforms/types.ts` and registered in `src/lib/transforms/registry.ts`. The Rewrite Strip implementation is the reference transform in `src/lib/transforms/rewrite.ts`.

Keep transform data pure: selection, document text, document type, voice context, and user id are passed through `TransformContext`. UI transforms should delegate to editor/controller code and return a `TransformResult` only after the user commits.

Every committed transform that changes prose should seed a style event with before/after text and context so the Style Profile stays useful.

## Add An AI Provider

Provider contracts live in `src/lib/ai/types.ts`. The resolver loads BYOK credentials from `user_credentials`, instantiates the provider factory, and wraps successful calls with `recordUsageEvent()`.

Use `src/lib/ai/providers/anthropic.ts` as the scaffold for real providers. Anthropic cached system blocks are wired with `cacheControl: { type: "ephemeral" }`; OpenAI follows the same interface without cache-specific metadata.

## Add A Renderer Mode

Rewrite rendering is shared through `RewriteStripProvider` in `src/components/editor/extensions/RewriteStrip/controller.tsx`. A new mode should consume the same session state and call the same `commit`, `cancel`, and `setAutoAdvance` actions.

Use `InlineStripRenderer.tsx` as the feature-complete reference. `SidePanelRenderer.tsx` and `OverlayModalRenderer.tsx` show how to attach alternate UI while keeping the data path identical.

## Data Model

- `projects`: optional organization buckets for documents.
- `documents`: TipTap JSON documents with type, voice context, tags, and style-profile inclusion.
- `document_snapshots`: periodic edit snapshots.
- `style_events`: rewrite and AI suggestion before/after pairs.
- `exemplars`: user-marked source passages.
- `style_preferences`: freeform voice guidance.
- `voice_profiles`: compiled prompt cache by user and scope.
- `user_credentials`: BYOK and future hosted credentials, split by `ownership`.
- `user_settings`: renderer mode, spotlight, toast, and voice-profile toggles.
- `usage_events`: token/cost ledger for BYOK and hosted AI calls.

## AI + Billing Architecture

The Rewrite Strip surfaces a "Suggest with AI" button when a provider is available. `resolveProviderForUser()` first checks for a default BYOK credential, then falls back to the operator-provided env keys (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) and returns a stub only if neither is configured. The selected provider's ownership (`user` for BYOK, `app` for env fallback) is stamped onto every `usage_events` row so cost can be split by source.

`POST /api/ai/rewrite` is the live call site: it pulls the compiled voice profile, applies the rate limit (see below), invokes the provider, and returns a clean suggestion to the editor. `GET /api/ai/status` reports whether AI is reachable so the UI can hide the button when it isn't.

Voice Profile tiering is implemented in `compileVoiceProfile()`. Light calls use preferences only. Heavy calls (the default for "Suggest with AI") include preferences, five exemplars, and fifteen edit pairs. When `always_send_full_voice_profile` is enabled, light calls are upgraded into cacheable full-profile system blocks for prompt caching.

### Rate limits (MVP)

`src/lib/ratelimit/index.ts` enforces conservative limits to keep operator API costs predictable while the app is unmonetized:

- **App-owned (env fallback)**: 15 calls/hour, 60 calls/day.
- **BYOK (user paid)**: 500/hour, 4000/day — effectively just a runaway-loop guard.
- **Allowlisted operator emails** (`LEXI_RATE_LIMIT_ALLOWLIST_EMAILS`): 100k/hour, 1M/day.

These thresholds are explicitly MVP-only and should be replaced with per-plan quotas when paid plans land.

## Document download

Every document can be downloaded as Markdown or Word via `GET /api/documents/[id]/download?format=md|docx`. Markdown is rendered from the TipTap JSON via `tipTapToMarkdown`; `.docx` is built as a minimal Office Open XML zip using the existing `archiver` dependency (no extra deps).

## Security Notes

Every application table has `user_id`, indexes on `user_id`, and RLS policies enforcing `auth.uid() = user_id` for select, insert, update, and delete.

Supabase Auth is Google OAuth only. `user_credentials.api_key` is plaintext in the MVP so BYOK management is live; KMS encryption is the first security TODO before broader access.

## Roadmap

- Replace MVP rate limits with per-plan quotas once paid plans ship.
- Add hosted/metered AI credentials with billing.
- Stream AI rewrites for incremental rendering.
- Add multi-user team/workspace membership.
- Add agent workflows over drafts and style-profile data.
- Encrypt `user_credentials.api_key`.
- Add focused integration tests for auth, RLS, export, and rewrite capture.
