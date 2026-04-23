import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIProviderFactory,
} from "@/lib/ai/types";

const DEFAULT_MODEL = "gpt-5";

function systemFromRequest(req: AICompletionRequest) {
  return [...(req.cachedSystemBlocks ?? []), req.system ?? ""]
    .filter(Boolean)
    .join("\n\n");
}

function usageFromResult(result: {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    inputTokenDetails?: {
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
    };
  };
}): AICompletionResponse["usage"] {
  return {
    inputTokens: result.usage?.inputTokens ?? 0,
    cachedInputTokens:
      result.usage?.inputTokenDetails?.cacheReadTokens ??
      result.usage?.inputTokenDetails?.cacheWriteTokens ??
      0,
    outputTokens: result.usage?.outputTokens ?? 0,
    estimatedCostUsd: 0,
  };
}

class OpenAIProvider implements AIProvider {
  id = "openai" as const;
  name = "OpenAI";
  private readonly model;

  constructor(apiKey: string) {
    const openai = createOpenAI({ apiKey });
    this.model = openai(DEFAULT_MODEL);
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const result = await generateText({
      model: this.model,
      system: systemFromRequest(req) || undefined,
      prompt: req.prompt,
      maxOutputTokens: req.maxTokens,
      temperature: req.temperature,
    });

    return {
      text: result.text,
      usage: usageFromResult(result),
    };
  }

  stream(req: AICompletionRequest): AsyncIterable<string> {
    const result = streamText({
      model: this.model,
      system: systemFromRequest(req) || undefined,
      prompt: req.prompt,
      maxOutputTokens: req.maxTokens,
      temperature: req.temperature,
    });

    return result.textStream;
  }
}

export const openaiFactory: AIProviderFactory = {
  id: "openai",
  name: "OpenAI",
  create(credential) {
    return new OpenAIProvider(credential.apiKey);
  },
};
