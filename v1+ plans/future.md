# Future Plan (v2 and beyond)

This file is a curated holding tank for ideas that are *not* on the immediate roadmap but that we have committed to keeping in mind as we design the v1 / v1.5 foundations. None of these are sized as PR-ready features yet — each section is intent + sketch, not spec. When one of these graduates onto an active iteration, lift it into a new `v2.md` (or wherever) and flesh it out at the same level of detail as the v1 / v1.5 features.

The ordering below is roughly grouped by theme, not by priority.

---

## Agentic platform

### Agents Level 4 — memory, subscriptions, asynchronous lives

The next level beyond panels (v1.5 / Level 3). Agents stop being one-shot prompts and become persistent collaborators with state.

Three components:

- **Per-agent memory.** An agent accumulates notes about the user and their work. Stored per agent, separate from the user's voice profile. Lets agents have *opinions that update* — "this writer tends to over-hedge in the second paragraph"; "they pushed back on my last few cuts to short paragraphs, so I should weight that signal."
- **Subscriptions.** An agent can be subscribed to a project or a tagged document set ("be the continuity editor on the novel"). It runs on its own when relevant changes happen — e.g. after a commit larger than 500 words, on a weekly cadence, or when a doc tagged `weekly` hasn't been touched in 5 days.
- **Agent-initiated work.** Background runs producing review threads, summaries, or notifications the user wakes up to. The user's relationship with an agent shifts from "I run them" to "they live in my project."

Schema sketch:
```
agent_memory     (id, agent_id, content_md, source_event_id, scope, created_at)
agent_subscriptions (agent_id, project_id|document_id, trigger, schedule, enabled)
agent_runs        (already exists from Level 2; gains a `triggered_by` column)
```

Open questions to settle when we reach this:
- How does an agent's memory interact with the voice profile? They can contradict; whose interpretation wins?
- How do we surface autonomous runs without becoming a notification engine?
- What's the cost ceiling for an "always-on" agent? (Strong default cap per user / per agent.)

### Agents Level 5 — agents as first-class artifacts

The ceiling. Agents become portable, programmable, tool-using, and (carefully) shareable.

- **Sharable agent bundles.** A signed JSON+markdown export of an agent (persona, tools, voice grounding, memory snapshot) that another lexi user can import and run on their own work. Compose with their own voice profile. "Try my Editor."
- **Agent marketplace.** With strong curation. The interesting cut is *literary lineage*: agents grounded in known authors' public-domain corpus, structured opinions, and critique vocabulary. ("Read this with a Strunk & White lens.") The corpus and critique vocab are real; the persona is a deliberate construct, not a celebrity-mimic.
- **Programmable hooks.** Agents callable via signed webhooks from outside lexi — "post a Critic review on this doc" from CI, from Slack, from a calendar trigger.
- **Tool-using agents.** Agents that call structured tools, not just produce text. A Research agent that runs web fetches and returns annotated citations. A Continuity agent that maintains a structured character/place graph. A Fact-checker that runs claims against a source set the user provided. Built on a `tools` registry parallel to the transforms registry, with per-agent tool gating.
- **Composable agent pipelines.** Agents as callable nodes. "Run Critic, then if it flags >3 issues run Editor on the flagged spans, then run Polish, then snapshot." Authored in a small DSL or a visual editor.
- **Per-agent distillation.** An agent with a long history of accepted feedback becomes a fine-tune candidate of its own — distill it into a cheaper model. The Voice Guard agent is the obvious first one to distill.

Important constraints to design for from earlier iterations (and that v1.5's foundations should not preclude):

- **Token economy.** Agents that read whole docs every run are expensive. Per-agent + per-doc caching is the production lever; design schema and prompt structure so cache keys are clean.
- **Provenance and trust.** Every agent-authored change must carry a clean audit trail: which agent, which run, which evidence. The `style_events` and `comment_threads` tables are the substrate; ensure `agent_id` and `agent_run_id` are persisted on everything they touch.

---

## Capture surfaces

The "Capture" stage (in the user's prioritization: 5th of 6). Less urgent than draft / review / think / reflect, but worth designing well when we get there.

### Email-to-lexi (featured)

> The user explicitly called this out as a love. When we get here, give it real care.

A unique address per user (e.g. `notes+<token>@lexi.app`) that, when emailed, creates a `brain_dump`-typed document with the email body as content and the subject as title. Attachments become document attachments (when we have them) or, in early versions, are linked back via the email source.

Design questions for that point:
- Is the email visible as the doc body verbatim, or does the system run a small "clean up the email artifacts" pass first (signature removal, quoted-reply stripping)? Default to verbatim with an undoable cleanup transform; preserve the user's exact words.
- How do we handle threaded replies? Append to the original doc, or new doc?
- How do we authenticate? A token in the address is convenient; we need to handle leaks gracefully.
- How does this integrate with email-in-from-anywhere (forwarded receipts, screenshots, etc.) — initially probably not at all; this is the entry point for "drop a thought," not a full inbox.

### Web clipper / share target

A browser extension and/or PWA share target that POSTs to `/api/exemplars` (or a new "loose exemplars" / "captures" table) with the page URL, selected text, and source title. The user is capturing reading they want to learn from; this fuels the "writers I'm influenced by" exemplar provenance from v1.5.

### Voice notes

Record audio → transcribe via Whisper or equivalent → land as a `brain_dump` document with the transcript and a link to the audio file. Brain dumps then feed downstream (especially Stream of Consciousness → Draft / Outline).

### Screenshot / OCR

Drop an image with text → OCR → land as a brain dump or as exemplar material with provenance. Useful for pulling quotes from books or articles you're reading on paper or in PDFs.

---

## Output / publishing

> User priority list ranks publish 6th; design that explicitly low-urgency.

- **Substack publishing.** Auth via API/key, push as draft, retain the lexi doc as source of truth.
- **Ghost, Notion, Medium, dev.to** — same pattern, each its own integration.
- **Markdown-to-file with frontmatter presets** by document type: `blog_post` gets Substack-flavored frontmatter; `work_doc` gets Notion-friendly export; `fiction` gets Scrivener-style chapter splits.
- **Public share links** with optional reader commenting (separate from internal collaborators — this is unauthenticated reader feedback). Requires careful auth and rate-limiting; not a small undertaking when we get there.

---

## Diff view / change visualization

A fourth `RendererMode` (alongside `inline_strip`, `side_panel`, `overlay_modal`) showing tracked changes vs. the original instead of the current "before / after" strip. Especially useful for agent passes, where the user might want to see all proposed changes at once rather than thread by thread.

> User feedback: "more thought needs to be put into the UI, to prevent clutter and keep it elegant and efficient."

Specific design considerations to think hard about when we ship this:

- How do we render diffs at the document level without the page becoming visually noisy?
- How do we differentiate user-tracked changes from agent-tracked changes from the underlying prose?
- Do diffs have their own dedicated mode (full-document review screen) or do they exist inline with toggle? Probably both.
- How do we collapse "just whitespace / paragraph rejoining" diffs that aren't meaningful?

The work is the UI. The data model is mostly straightforward (we already snapshot before destructive operations; agent runs already produce structured comments and proposed rewrites).

---

## Long-form companion (fiction / book-length work)

A separate sidecar surface for projects with long-form, multi-doc structure. Tracks:

- Characters (name, description, traits, arc notes)
- Places (similar shape)
- Timelines (events, dates)
- Continuity rules ("never describe X as Y")

Drives transforms / agents like:
- "Did I describe this character consistently?"
- "Find every scene where X happens."
- "Does the pacing of chapter 4 match my outline?"
- "Am I overusing the word 'something' in dialogue?"

Sits naturally alongside Agents Level 4 (agents subscribed to a fiction project become continuity editors with persistent memory of the world).

---

## Reflective / corpus features

### Reading mode for your own corpus

A surface for re-reading your own writing easily. A searchable, organized view of your past work that the AI can also search for analogies / references when you're drafting. ("I covered this same point better in the March 12 draft — quote it?")

### Cross-doc cohesion checks

For serial publishing (newsletters, blog series): check if a new piece contradicts or unintentionally repeats prior pieces. The corpus already exists; the agent / pipeline does not.

### Live drift coach (passive)

While typing, a low-frequency cached call (debounced) flags when the user is slipping out of voice. No suggestions — just a soft margin marker. Click for explanation. This is the canonical Anthropic prompt-cache use case (same voice profile + tiny diff per call); cost-feasible because of caching.

### Voice fingerprint export

A signed, portable bundle of "this is how I write" (preferences + curated exemplars + extracted patterns + few-shot pack) exportable as a file. The user can plug it into other tools (Cursor system prompts, ChatGPT custom instructions, Anthropic system prompts). lexi becomes the voice-of-record. The FSL license aligns nicely with this; it's the kind of feature that makes the source-available story compelling.

### Personal fine-tune / distillation loop

When a user has accumulated thousands of `style_events`, offer a one-click "distill my style into a cheaper model" — fine-tune a Haiku-class model on accepted rewrite pairs scoped per `voice_context`. Use it for the highest-frequency surfaces (Live Drift Coach, Voice Guard agent). Big leap; gated on token economics making it worthwhile.

---

## Style Guide model-mediated editing

> Mentioned in v1 (kept v1's direct-editing as is); committed here as the future direction.

Today (v1) the user can edit `style_preferences.content` directly. This works for sophisticated users; it's risky for less sophisticated users who might unknowingly trash the structure that makes the prompt useful.

Future direction: edits to compiled training material are mediated by a lightweight model. The user types what they want changed; the model surgically applies the change to the prompt while preserving structure, tone, and other rules. The edit + the model's transformation are both shown to the user before saving.

This is a small but high-value feature. Lift to v2 when the editing surface starts seeing real cross-section of users.

---

## Multi-tenant / collaboration

These are the "lexi-as-a-product-beyond-one-person" arcs. None of them belongs in the next two iterations.

### lexi for teams

Shared style profiles for a brand voice. Same corpus model, scoped to an organization. Editorial review workflows on top. Per-member permissions on style guide edits. Team agents (roles defined at the org level, accessible to all members).

### lexi for ghostwriters

Explicit "voice as a tenant" model: I am writing as Person A today, switch profiles. Multi-voice management is the product. Auditable history of which voice produced which prose.

### Local-first sync / multiplayer

The TipTap content model is local-friendly. A yjs or automerge layer would unlock offline + multiplayer. This is significant infra work; it earns its place when collaboration is a real demand or when offline reliability becomes a top user complaint.

### Public share links with comments

Unauthenticated reader feedback on shared docs. Distinct from team collaboration. Requires careful abuse prevention (rate limiting, captcha, moderation tooling).

---

## Operational / business

### Per-plan quotas and hosted billing

Replace the MVP rate limits in `src/lib/ratelimit/index.ts` with real per-plan quotas. Add a third `ownership = 'hosted_metered'` (or similar) tier so users without their own keys pay per token through lexi. Stripe integration. Plan tiers. Usage dashboards adapted for billable usage.

### Soft-delete / trash for documents

Currently delete is final. Add a trash with retention before permanent deletion.

### Per-project glossaries (extension of v1.5 doc-glossary)

Glossaries scoped to projects, not just documents. Lift `glossaries.document_id` to optionally `project_id`. Inherits from project to docs unless overridden.

### Webhook receivers

For Agents Level 5's programmable hooks: signed webhooks for external triggers. "Run the Critic on PR #1234" from a CI integration.

### Multiple credentials per provider

Currently one default credential per provider per user. Users with multiple keys (work vs. personal Anthropic accounts, for example) want multi-credential support with explicit picker.

---

## "Lexi as the writing surface" gaps (continued thinking)

These are smaller observations that may matter:

- **Doc-level dictation / voice mode** — talk into a doc, get prose. Different from voice notes (which produces brain dumps); this is real-time dictation as an input mode for any doc.
- **Selection-history.** A "show me the last five things I rewrote in this doc" affordance; useful for fast revision passes.
- **Macro / saved-prompt support.** Power users will want to save their own custom transforms ("rewrite as a tweet thread"). Once the transform registry is mature, exposing it as user-extensible is a reasonable v2 move.
- **Explicit "style anchors" within a doc.** Allow the user to pin a paragraph as "this is the tone for the rest of the doc"; AI features then weight that paragraph heavily.
- **Versioned voice profiles.** Currently `voice_profiles` is a single compiled prompt per `(user, scope)`. Versioning lets the user roll back when an extraction or walkthrough produces a worse profile than what came before.
- **Intent-aware drafting** — when the user starts a doc with a clear intent ("draft an email politely declining"), surface intent-specific transforms and disable irrelevant ones.

---

## Things we're explicitly NOT doing (and shouldn't drift into)

- **General-purpose chat assistant.** lexi is not a chat product. The in-line chat in v1.5 is contained on purpose.
- **Real-time multiplayer authoring** before there's any signal users want it. (Local-first / multiplayer is in this future doc, but only as an enabler — not a product pillar.)
- **AI-generated content presented as the user's writing without transparent provenance.** Every AI-touched piece of prose has a `style_event` or comment thread tying it to the agent / call that produced it. Future features must preserve this property.
- **Notification engines.** Even Agents Level 4's autonomous runs are designed to notify in-app, in the journal — not push, not email, not Slack.
- **Trying to be Notion / Roam / Obsidian.** The capture surfaces above add light intake; the journal is for meta-reflection and context. lexi should not become a knowledge-management tool. Adjacent, complementary, but separate.
