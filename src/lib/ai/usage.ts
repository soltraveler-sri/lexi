import * as usageRepo from "@/lib/db/repos/usage";
import type { UsageEventInsert } from "@/lib/db/schema";
import type { AICompletionRequest, AICompletionResponse } from "@/lib/ai/types";

export async function recordUsageEvent(
  userId: string,
  provider: string,
  model: string,
  request: AICompletionRequest,
  usage: AICompletionResponse["usage"],
) {
  const event: UsageEventInsert = {
    userId,
    provider,
    model,
    callTier: request.tier,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd: usage.estimatedCostUsd.toFixed(6),
    documentId: request.documentId ?? null,
    transformId: request.transformId ?? null,
  };

  return usageRepo.create(event);
}
