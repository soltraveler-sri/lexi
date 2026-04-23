export type CallTier = "light" | "heavy";

export interface AICompletionRequest {
  system?: string;
  cachedSystemBlocks?: string[];
  prompt: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  tier: CallTier;
  documentId?: string;
  transformId?: string;
}

export interface AICompletionResponse {
  text: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
}

export interface AIProvider {
  id: "anthropic" | "openai" | "stub";
  name: string;
  complete(req: AICompletionRequest): Promise<AICompletionResponse>;
  stream(req: AICompletionRequest): AsyncIterable<string>;
}

export interface AIProviderFactory {
  id: AIProvider["id"];
  name: string;
  create(credential: { apiKey: string; ownership: "user" | "app" }): AIProvider;
}
