import * as credentialsRepo from "@/lib/db/repos/credentials";
import * as usageRepo from "@/lib/db/repos/usage";
import { createAnthropicWebSearch } from "@/lib/ai/tools/websearch/anthropic";
import { createOpenAIWebSearch } from "@/lib/ai/tools/websearch/openai";
import type {
  WebSearchOptions,
  WebSearchProvider,
  WebSearchResponse,
  WebSearchResult,
} from "@/lib/ai/tools/websearch/types";
import type { CredentialOwnership } from "@/types";

interface ResolvedSearchProvider {
  provider: WebSearchProvider;
  ownership: CredentialOwnership;
}

function envApiKeyForProvider(providerId: "anthropic" | "openai") {
  if (providerId === "anthropic") {
    return process.env.ANTHROPIC_API_KEY?.trim() || null;
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function defaultEnvProvider(): "anthropic" | "openai" | null {
  const preferred = process.env.LEXI_DEFAULT_AI_PROVIDER?.trim().toLowerCase();
  if (preferred === "anthropic" && envApiKeyForProvider("anthropic")) {
    return "anthropic";
  }
  if (preferred === "openai" && envApiKeyForProvider("openai")) {
    return "openai";
  }
  if (envApiKeyForProvider("anthropic")) {
    return "anthropic";
  }
  if (envApiKeyForProvider("openai")) {
    return "openai";
  }
  return null;
}

function buildProvider(
  providerId: "anthropic" | "openai",
  apiKey: string,
): WebSearchProvider {
  return providerId === "anthropic"
    ? createAnthropicWebSearch(apiKey)
    : createOpenAIWebSearch(apiKey);
}

export async function resolveWebSearchProviderForUser(
  userId: string,
): Promise<ResolvedSearchProvider | null> {
  const credential = await credentialsRepo.getDefaultForUser(userId);

  if (credential && (credential.provider === "anthropic" || credential.provider === "openai")) {
    return {
      provider: buildProvider(credential.provider, credential.apiKey),
      ownership: credential.ownership,
    };
  }

  const envProviderId = defaultEnvProvider();
  if (envProviderId) {
    const apiKey = envApiKeyForProvider(envProviderId);
    if (apiKey) {
      return {
        provider: buildProvider(envProviderId, apiKey),
        ownership: "app",
      };
    }
  }

  return null;
}

export async function isWebSearchAvailableForUser(userId: string): Promise<{
  available: boolean;
  providerId: "anthropic" | "openai" | null;
}> {
  const resolved = await resolveWebSearchProviderForUser(userId);
  return {
    available: Boolean(resolved),
    providerId: resolved ? resolved.provider.id : null,
  };
}

export async function webSearch(params: {
  userId: string;
  query: string;
  options?: WebSearchOptions;
}): Promise<WebSearchResponse> {
  const resolved = await resolveWebSearchProviderForUser(params.userId);
  if (!resolved) {
    throw new Error("ai_not_configured");
  }

  const response = await resolved.provider.search(params.query, params.options);

  await usageRepo
    .create({
      userId: params.userId,
      provider: resolved.provider.id,
      ownership: resolved.ownership,
      model: `${resolved.provider.id}:web_search`,
      callTier: "heavy",
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: "0",
      transformId: "tool:web_search",
    })
    .catch(() => {
      // Fall through — the search succeeded; we just couldn't log usage.
    });

  return response;
}

export type { WebSearchProvider, WebSearchResponse, WebSearchResult, WebSearchOptions };
export type { WebSearchResult as TWebSearchResult } from "@/lib/ai/tools/websearch/types";
