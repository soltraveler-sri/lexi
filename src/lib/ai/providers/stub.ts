import type {
  AICompletionResponse,
  AIProvider,
  AIProviderFactory,
} from "@/lib/ai/types";

class StubProvider implements AIProvider {
  id = "stub" as const;
  name = "Not configured";

  async complete(): Promise<AICompletionResponse> {
    throw new Error("AI provider not configured");
  }

  async *stream(): AsyncIterable<string> {
    throw new Error("AI provider not configured");
  }
}

export const stubFactory: AIProviderFactory = {
  id: "stub",
  name: "Not configured",
  create() {
    return new StubProvider();
  },
};
