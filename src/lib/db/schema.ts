import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  CredentialOwnership,
  DocumentType,
  RendererMode,
  StyleEventType,
  TipTapDocument,
  VoiceContext,
} from "@/types";

export const documentTypeEnum = pgEnum("document_type", [
  "blog_post",
  "work_doc",
  "fiction",
  "communication",
  "brain_dump",
  "other",
] satisfies [DocumentType, ...DocumentType[]]);

export const voiceContextEnum = pgEnum("voice_context", [
  "blog_post",
  "work_doc",
  "fiction",
  "communication",
  "universal",
] satisfies [VoiceContext, ...VoiceContext[]]);

export const styleEventTypeEnum = pgEnum("style_event_type", [
  "rewrite",
  "ai_suggestion_accepted",
  "ai_suggestion_edited",
  "ai_suggestion_rejected",
  "annotation",
] satisfies [StyleEventType, ...StyleEventType[]]);

export const credentialOwnershipEnum = pgEnum("credential_ownership", [
  "user",
  "app",
] satisfies [CredentialOwnership, ...CredentialOwnership[]]);

export const rendererModeEnum = pgEnum("renderer_mode", [
  "inline_strip",
  "side_panel",
  "overlay_modal",
] satisfies [RendererMode, ...RendererMode[]]);

export const callTierEnum = pgEnum("call_tier", ["light", "heavy"]);

const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    userIdx: index("projects_user_id_idx").on(table.userId),
    userSortIdx: index("projects_user_sort_idx").on(table.userId, table.sortOrder),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull().default("Untitled"),
    content: jsonb("content")
      .$type<TipTapDocument>()
      .notNull()
      .default(sql`'{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb`),
    type: documentTypeEnum("type").notNull().default("blog_post"),
    voiceContext: voiceContextEnum("voice_context").notNull().default("universal"),
    includeInStyleProfile: boolean("include_in_style_profile").notNull().default(true),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceDocumentId: uuid("source_document_id"),
    wordCount: integer("word_count").notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    userIdx: index("documents_user_id_idx").on(table.userId),
    projectIdx: index("documents_project_id_idx").on(table.projectId),
    sourceIdx: index("documents_source_document_id_idx").on(table.sourceDocumentId),
    updatedIdx: index("documents_user_updated_idx").on(table.userId, table.updatedAt),
  }),
);

export const documentSnapshots = pgTable(
  "document_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: jsonb("content").$type<TipTapDocument>().notNull(),
    wordCount: integer("word_count").notNull().default(0),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("document_snapshots_user_id_idx").on(table.userId),
    documentCapturedIdx: index("document_snapshots_document_captured_idx").on(
      table.documentId,
      table.capturedAt,
    ),
  }),
);

export const styleEvents = pgTable(
  "style_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    eventType: styleEventTypeEnum("event_type").notNull(),
    beforeText: text("before_text").notNull(),
    afterText: text("after_text").notNull(),
    surroundingBefore: text("surrounding_before").notNull().default(""),
    surroundingAfter: text("surrounding_after").notNull().default(""),
    documentType: text("document_type").notNull(),
    voiceContext: text("voice_context").notNull(),
    editTags: text("edit_tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    note: text("note"),
    aiPrompt: text("ai_prompt"),
    aiProvider: text("ai_provider"),
    timeSpentMs: integer("time_spent_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("style_events_user_id_idx").on(table.userId),
    documentIdx: index("style_events_document_id_idx").on(table.documentId),
    userCreatedIdx: index("style_events_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const exemplars = pgTable(
  "exemplars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    fromPos: integer("from_pos").notNull(),
    toPos: integer("to_pos").notNull(),
    textSnapshot: text("text_snapshot").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("exemplars_user_id_idx").on(table.userId),
    documentIdx: index("exemplars_document_id_idx").on(table.documentId),
  }),
);

export const stylePreferences = pgTable(
  "style_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: uniqueIndex("style_preferences_user_id_key").on(table.userId),
  }),
);

export const voiceProfiles = pgTable(
  "voice_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    scope: voiceContextEnum("scope").notNull(),
    compiledSystemPrompt: text("compiled_system_prompt").notNull(),
    includedExemplarIds: uuid("included_exemplar_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    includedEventIds: uuid("included_event_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    compiledAt: timestamp("compiled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("voice_profiles_user_id_idx").on(table.userId),
    userScopeIdx: uniqueIndex("voice_profiles_user_scope_key").on(
      table.userId,
      table.scope,
    ),
  }),
);

export const userCredentials = pgTable(
  "user_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    ownership: credentialOwnershipEnum("ownership").notNull().default("user"),
    apiKey: text("api_key").notNull(),
    label: text("label").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    userIdx: index("user_credentials_user_id_idx").on(table.userId),
    userProviderLabelIdx: uniqueIndex("user_credentials_user_provider_label_key").on(
      table.userId,
      table.provider,
      table.label,
    ),
  }),
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    rendererMode: rendererModeEnum("renderer_mode").notNull().default("inline_strip"),
    spotlightIntensity: integer("spotlight_intensity").notNull().default(75),
    alwaysSendFullVoiceProfile: boolean("always_send_full_voice_profile")
      .notNull()
      .default(false),
    editTagToastEnabled: boolean("edit_tag_toast_enabled").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    userIdx: uniqueIndex("user_settings_user_id_key").on(table.userId),
  }),
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    ownership: credentialOwnershipEnum("ownership").notNull().default("user"),
    model: text("model").notNull(),
    callTier: callTierEnum("call_tier").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostUsd: numeric("estimated_cost_usd", {
      precision: 10,
      scale: 6,
    })
      .notNull()
      .default("0"),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    transformId: text("transform_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("usage_events_user_id_idx").on(table.userId),
    userCreatedIdx: index("usage_events_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    userProviderCreatedIdx: index("usage_events_user_provider_created_idx").on(
      table.userId,
      table.provider,
      table.createdAt,
    ),
    userOwnershipCreatedIdx: index("usage_events_user_ownership_created_idx").on(
      table.userId,
      table.ownership,
      table.createdAt,
    ),
  }),
);

export const projectRelations = relations(projects, ({ many }) => ({
  documents: many(documents),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  snapshots: many(documentSnapshots),
  styleEvents: many(styleEvents),
  exemplars: many(exemplars),
}));

export type Project = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;
export type DocumentSnapshot = typeof documentSnapshots.$inferSelect;
export type DocumentSnapshotInsert = typeof documentSnapshots.$inferInsert;
export type StyleEvent = typeof styleEvents.$inferSelect;
export type StyleEventInsert = typeof styleEvents.$inferInsert;
export type Exemplar = typeof exemplars.$inferSelect;
export type ExemplarInsert = typeof exemplars.$inferInsert;
export type StylePreference = typeof stylePreferences.$inferSelect;
export type StylePreferenceInsert = typeof stylePreferences.$inferInsert;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type VoiceProfileInsert = typeof voiceProfiles.$inferInsert;
export type UserCredential = typeof userCredentials.$inferSelect;
export type UserCredentialInsert = typeof userCredentials.$inferInsert;
export type UserSetting = typeof userSettings.$inferSelect;
export type UserSettingInsert = typeof userSettings.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type UsageEventInsert = typeof usageEvents.$inferInsert;
