import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, hasToolCall, stepCountIs, type ModelMessage } from "ai";

import type {
  WebSearchOptions,
  WebSearchProvider,
  WebSearchResponse,
  WebSearchResult,
} from "@/lib/ai/tools/websearch/types";

// Wraps Anthropic's server-side `web_search` tool (Vercel AI SDK exposes it as
// `anthropic.tools.webSearch_20250305`). The tool returns an array of
// `{ url, title, pageAge, encryptedContent }`. We surface url/title/sourceDate
// directly; the snippet is left empty because `encryptedContent` is opaque.

const DEFAULT_MAX_RESULTS = 6;

interface AnthropicSearchEntry {
  type: "web_search_result";
  url: string;
  title: string | null;
  pageAge: string | null;
  encryptedContent: string;
}

class AnthropicWebSearch implements WebSearchProvider {
  readonly id = "anthropic" as const;
  readonly name = "Anthropic";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async search(
    query: string,
    options: WebSearchOptions = {},
  ): Promise<WebSearchResponse> {
    const max = options.maxResults ?? DEFAULT_MAX_RESULTS;
    const anthropic = createAnthropic({ apiKey: this.apiKey });
    const model = anthropic("claude-sonnet-4-5");

    const messages: ModelMessage[] = [
      {
        role: "system",
        content:
          "You are a research assistant. Use the web_search tool exactly once to find sources for the user's query. Then reply with a concise one-line summary; the host application will display the raw search results separately.",
      },
      { role: "user", content: query },
    ];

    const result = await generateText({
      model,
      messages,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 1 }),
      },
      stopWhen: [stepCountIs(2), hasToolCall("web_search")],
      maxOutputTokens: 256,
    });

    const harvested: WebSearchResult[] = [];

    for (const step of result.steps ?? []) {
      for (const toolResult of step.toolResults ?? []) {
        if (toolResult.toolName !== "web_search") {
          continue;
        }
        const entries = toolResult.output as
          | AnthropicSearchEntry[]
          | undefined;

        if (!Array.isArray(entries)) {
          continue;
        }

        for (const entry of entries) {
          if (!entry?.url || !entry?.title) {
            continue;
          }
          if (harvested.length >= max) {
            break;
          }
          harvested.push({
            title: entry.title,
            url: entry.url,
            snippet: "",
            sourceDate: entry.pageAge ?? undefined,
          });
        }
      }
    }

    if (harvested.length === 0) {
      throw new Error(
        "Anthropic web_search returned no results. The provider may need this tool enabled on your account, or the query produced no hits.",
      );
    }

    return {
      results: harvested,
      queryUsed: query,
      provider: "anthropic",
    };
  }
}

export function createAnthropicWebSearch(apiKey: string): WebSearchProvider {
  return new AnthropicWebSearch(apiKey);
}
