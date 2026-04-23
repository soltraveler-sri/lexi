import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIProviderFactory,
} from "@/lib/ai/types";

const DEFAULT_MODEL = "claude-sonnet-4-5";

type CacheableSystemMessage = {
  role: "system";
  content: string;
  providerOptions?: {
    anthropic: {
      cacheControl: {
        type: "ephemeral";
      };
    };
  };
};

type UserMessage = {
  role: "user";
  content: string;
};

function toMessages(req: AICompletionRequest) {
  const cachedBlocks: CacheableSystemMessage[] =
    req.cachedSystemBlocks?.map((block) => ({
      role: "system",
      content: block,
      providerOptions: {
        anthropic: {
          cacheControl: {
            type: "ephemeral",
          },
        },
      },
    })) ?? [];

  const systemBlocks: CacheableSystemMessage[] = req.system
    ? [{ role: "system", content: req.system }]
    : [];

  return [
    ...cachedBlocks,
    ...systemBlocks,
    { role: "user", content: req.prompt } satisfies UserMessage,
  ];
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

class AnthropicProvider implements AIProvider {
  id = "anthropic" as const;
  name = "Anthropic";
  private readonly model;

  constructor(apiKey: string) {
    const anthropic = createAnthropic({ apiKey });
    this.model = anthropic(DEFAULT_MODEL);
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const result = await generateText({
      model: this.model,
      messages: toMessages(req),
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
      messages: toMessages(req),
      maxOutputTokens: req.maxTokens,
      temperature: req.temperature,
    });

    return result.textStream;
  }
}

export const anthropicFactory: AIProviderFactory = {
  id: "anthropic",
  name: "Anthropic",
  create(credential) {
    return new AnthropicProvider(credential.apiKey);
  },
};
