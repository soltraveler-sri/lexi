import * as credentialsRepo from "@/lib/db/repos/credentials";
import { getProviderFactory } from "@/lib/ai/registry";
import { recordUsageEvent } from "@/lib/ai/usage";
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "@/lib/ai/types";

const defaultModelByProvider: Record<AIProvider["id"], string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-5",
  stub: "none",
};

function withUsageRecording(userId: string, provider: AIProvider): AIProvider {
  return {
    id: provider.id,
    name: provider.name,
    async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
      const response = await provider.complete(req);
      await recordUsageEvent(
        userId,
        provider.id,
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

export async function resolveProviderForUser(
  userId: string,
  preferredProvider?: string,
) {
  const credential = await credentialsRepo.getDefaultForUser(userId, preferredProvider);

  if (!credential) {
    return getProviderFactory("stub").create({
      apiKey: "",
      ownership: "user",
    });
  }

  const factory = getProviderFactory(credential.provider);
  const provider = factory.create({
    apiKey: credential.apiKey,
    ownership: credential.ownership,
  });

  return withUsageRecording(userId, provider);
}
