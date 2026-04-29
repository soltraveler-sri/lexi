import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/access";
import { ensureForUser } from "@/lib/db/repos/settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DocumentType, RendererMode, StyleEventType, VoiceContext } from "@/types";
import type { TipTapDocument } from "@/types";

export async function getApiUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    return null;
  }

  await ensureForUser(user.id);
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
}

export function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function readJsonObject(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  return body as Record<string, unknown>;
}

export function readString(body: Record<string, unknown>, key: string, fallback = "") {
  const value = body[key];
  return typeof value === "string" ? value : fallback;
}

export function readOptionalString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

export function readBoolean(
  body: Record<string, unknown>,
  key: string,
  fallback = false,
) {
  const value = body[key];
  return typeof value === "boolean" ? value : fallback;
}

export function readNumber(body: Record<string, unknown>, key: string, fallback = 0) {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function readStringArray(body: Record<string, unknown>, key: string) {
  const value = body[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function isDocumentType(value: unknown): value is DocumentType {
  return (
    value === "blog_post" ||
    value === "work_doc" ||
    value === "fiction" ||
    value === "communication" ||
    value === "brain_dump" ||
    value === "other"
  );
}

export function isVoiceContext(value: unknown): value is VoiceContext {
  return (
    value === "blog_post" ||
    value === "work_doc" ||
    value === "fiction" ||
    value === "communication" ||
    value === "universal"
  );
}

export function isRendererMode(value: unknown): value is RendererMode {
  return (
    value === "inline_strip" || value === "side_panel" || value === "overlay_modal"
  );
}

export function isStyleEventType(value: unknown): value is StyleEventType {
  return (
    value === "rewrite" ||
    value === "ai_suggestion_accepted" ||
    value === "ai_suggestion_edited" ||
    value === "ai_suggestion_rejected" ||
    value === "annotation"
  );
}

export function isTipTapDocument(value: unknown): value is TipTapDocument {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "type" in value &&
    (value as { type?: unknown }).type === "doc"
  );
}
