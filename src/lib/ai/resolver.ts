import * as credentialsRepo from "@/lib/db/repos/credentials";
import { getProviderFactory } from "@/lib/ai/registry";
import { recordUsageEvent } from "@/lib/ai/usage";
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "@/lib/ai/types";
import type { CredentialOwnership } from "@/types";

const defaultModelByProvider: Record<AIProvider["id"], string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-5",
  stub: "none",
};

export interface ResolvedProvider {
  provider: AIProvider;
  ownership: CredentialOwnership;
}

function withUsageRecording(
  userId: string,
  ownership: CredentialOwnership,
  provider: AIProvider,
): AIProvider {
  return {
    id: provider.id,
    name: provider.name,
    async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
      const response = await provider.complete(req);
      await recordUsageEvent(
        userId,
        provider.id,
        ownership,
        defaultModelByProvider[provider.id],
        req,
        response.usage,
      );
      return response;
    },
    async *stream(req: AICompletionRequest): AsyncIterable<string> {
      let succeeded = false;

      for await (const chunk of provider.stream(req)) {
        succeeded = true;
        yield chunk;
      }

      if (succeeded) {
        await recordUsageEvent(
          userId,
          provider.id,
          ownership,
          defaultModelByProvider[provider.id],
          req,
          {
            inputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
          },
        );
      }
    },
  };
}

function envApiKeyForProvider(providerId: string): string | null {
  if (providerId === "anthropic") {
    return process.env.ANTHROPIC_API_KEY?.trim() || null;
  }

  if (providerId === "openai") {
    return process.env.OPENAI_API_KEY?.trim() || null;
  }

  return null;
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

export async function resolveProviderForUser(
  userId: string,
  preferredProvider?: string,
): Promise<ResolvedProvider> {
  const credential = await credentialsRepo.getDefaultForUser(userId, preferredProvider);

  if (credential) {
    const factory = getProviderFactory(credential.provider);
    const base = factory.create({
      apiKey: credential.apiKey,
      ownership: credential.ownership,
    });

    return {
      provider: withUsageRecording(userId, credential.ownership, base),
      ownership: credential.ownership,
    };
  }

  const envProviderId =
    preferredProvider && envApiKeyForProvider(preferredProvider)
      ? (preferredProvider as "anthropic" | "openai")
      : defaultEnvProvider();

  if (envProviderId) {
    const apiKey = envApiKeyForProvider(envProviderId);

    if (apiKey) {
      const factory = getProviderFactory(envProviderId);
      const base = factory.create({ apiKey, ownership: "app" });

      return {
        provider: withUsageRecording(userId, "app", base),
        ownership: "app",
      };
    }
  }

  return {
    provider: getProviderFactory("stub").create({ apiKey: "", ownership: "user" }),
    ownership: "user",
  };
}

export function isAiConfiguredViaEnv(): boolean {
  return Boolean(envApiKeyForProvider("anthropic") || envApiKeyForProvider("openai"));
}
