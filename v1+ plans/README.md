# v1+ Plans

This folder is the north-star resource for everything we're building in lexi after the MVP. It is **not** a set of prompts to feed coding agents verbatim. It is comprehensive guidance — intent, UX design, architectural notes, guardrails — that coding agents can pull chunks out of when they pick up a single feature.

## How this is organized

Three iteration plans, in order of urgency:

- **`v1.md`** — the next round of shipping. Transforms are the heart of v1; agents make their first appearance; the journal surface and onboarding flow get built. Treat this as the active backlog.
- **`v1.5.md`** — the round after v1 lands. Adds the second wave of transforms, the margin-comments primitive, agent passes and panels, in-line chat, and journal expansions. Many v1.5 features depend on v1 plumbing.
- **`future.md`** — bigger arcs (Agents Levels 4–5, capture surfaces, publishing integrations, fine-tuning, marketplace, team/multi-tenant features, diff view, drift coach, and others). These are not on a timeline. They live here so we can keep ideating without losing them and so v1/v1.5 work can be built on foundations that don't paint us into a corner.

## How coding agents should use these docs

1. **Pick one (or two related) features at a time.** Each feature in v1 and v1.5 is sized to be its own PR or, for the larger ones, its own short feature branch. Do not attempt to land an entire iteration in one session — context and review quality both fall off a cliff.
2. **Read the whole iteration plan first.** Even if you're only implementing one feature, the surrounding features establish the patterns and constraints (especially the registry-shaped systems like transforms, agents, doc-level transforms).
3. **Treat UX intent as binding, implementation details as suggestions.** When the doc says "the doc-level CTA should feel inviting on a blank doc, not like a form," that's a non-negotiable behavior; any approach that hits it is fine. When the doc says "extend the existing `Transform` registry," that's a strong default but you can argue for an alternative if it cleanly avoids breaking the in-line transform contract.
4. **Always check current state of the codebase against the plan.** These docs were written at a point in time. If something has shifted — the schema has new columns, a transform has been added, a route has been renamed — work from reality, not from this doc.
5. **Update the plan when you ship.** When a feature lands, mark it shipped (a checkbox in the iteration file is enough) and note any decisions that diverged from the plan, so the next agent isn't working from stale guidance.
6. **Don't add features outside scope.** v1 is locked at "what's in v1.md." If you find yourself wanting to also fix X, write a one-line note in the relevant iteration file and flag it; do not roll it into your PR.

## What every feature spec contains

- **Goal / why this matters** — short, principled, written so an agent can decide trade-offs from first principles.
- **What ships** — the user-visible scope.
- **UX intent** — the experience the user should have. What it should feel like; what it should *not* feel like.
- **Architecture notes** — where it slots into existing code, which existing seams to extend (transforms registry, voice profile compiler, AI resolver, renderer modes, etc.).
- **Guardrails / anti-patterns** — what *not* to build. This is often the most important part.
- **Acceptance criteria** — concrete checks for "done."
- **Dependencies** — what must already exist (in v1, in earlier features within the same iteration, or in the codebase).

## Cross-cutting principles (apply everywhere)

These are non-negotiable across all iterations.

- **Lexi is a writing tool, not a chat tool.** Every feature lives in service of the writing surface. Anything that pulls the user's attention away from the document for more than a few seconds needs an unusually strong justification.
- **The Style Profile is the moat.** Every feature that touches user prose should — where it can do so cleanly — feed back into the corpus (`style_events`, `exemplars`, derived preferences). When a feature changes prose without producing a `style_event`, that's a regression of a sort.
- **Preserve voice by default.** The user's `voice_profile` (compiled from preferences + exemplars + edit pairs) is the default system context for any AI-touching surface. Opt-out is fine; bypassing silently is not.
- **Cost-aware by construction.** Every AI call has a `tier` (`light` / `heavy`) and a `transformId`. Every doc-level transform pre-warns the user about cost order-of-magnitude before running. Anthropic ephemeral cache (`cachedSystemBlocks`) is used wherever a system prompt repeats across calls in a short window.
- **No silent destruction.** Any operation that replaces document content (doc-level transforms, agent rewrites, "Analyze my edits" actions on preferences) takes a snapshot first and is reversible.
- **Elegant over cluttered.** When in doubt about UI density, choose the calmer option. Margin comments, variant strips, doc-level CTAs — every surface needs to feel like the writing app respects the user's eye.
- **Don't mutate user-owned corpus without consent.** Voice-profile material, preferences, and exemplars are the user's source of truth. AI can *propose* changes; only an explicit user action commits them.
- **Always update the plan when reality diverges.** Stale plans are worse than no plans.

## Versioning the plan

Each iteration file has a "Status" header at the top with a short list (e.g. "Streaming rewrites — shipped on PR #N"). Keep that current. When an iteration is fully done, leave the file in place and start the next one — these are also a record of what we built and why.
