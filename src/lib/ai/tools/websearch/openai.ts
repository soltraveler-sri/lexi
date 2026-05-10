import { createOpenAI } from "@ai-sdk/openai";
import { generateText, hasToolCall, stepCountIs, type ModelMessage } from "ai";

import type {
  WebSearchOptions,
  WebSearchProvider,
  WebSearchResponse,
  WebSearchResult,
} from "@/lib/ai/tools/websearch/types";

// OpenAI's webSearch tool (via the Responses API) returns the tool call's
// internal action + `sources: [{ type: "url", url }]` rather than full
// title/snippet records. We turn those into rough WebSearchResult entries by
// using the URL's hostname as the title placeholder when we have nothing
// else, and leaving snippet empty. The synthesized text from the model is
// returned as the queryUsed so the caller can show it as the headline.

const DEFAULT_MAX_RESULTS = 6;

type WebSearchActionOutput = {
  action?: { type: string; query?: string };
  sources?: Array<{ type: "url"; url: string } | { type: "api"; name: string }>;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

class OpenAIWebSearch implements WebSearchProvider {
  readonly id = "openai" as const;
  readonly name = "OpenAI";
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
    const openai = createOpenAI({ apiKey: this.apiKey });
    const model = openai("gpt-5");

    const messages: ModelMessage[] = [
      {
        role: "system",
        content:
          "You are a research assistant. Use the web_search tool exactly once to find sources for the user's query. Then reply with a concise one-line summary; the host application will display the raw URLs separately.",
      },
      { role: "user", content: query },
    ];

    const result = await generateText({
      model,
      messages,
      tools: {
        web_search: openai.tools.webSearch({ searchContextSize: "low" }),
      },
      stopWhen: [stepCountIs(2), hasToolCall("web_search")],
      maxOutputTokens: 256,
    });

    const harvested: WebSearchResult[] = [];
    let queryUsed = query;

    for (const step of result.steps ?? []) {
      for (const toolResult of step.toolResults ?? []) {
        if (toolResult.toolName !== "web_search") {
          continue;
        }
        const output = toolResult.output as WebSearchActionOutput | undefined;

        if (!output) {
          continue;
        }

        if (output.action?.type === "search" && output.action.query) {
          queryUsed = output.action.query;
        }

        for (const source of output.sources ?? []) {
          if (source.type !== "url" || !source.url) {
            continue;
          }
          if (harvested.length >= max) {
            break;
          }
          harvested.push({
            title: hostnameOf(source.url),
            url: source.url,
            snippet: "",
          });
        }
      }
    }

    const summary = result.text?.trim();

    if (harvested.length === 0) {
      throw new Error(
        "OpenAI web_search returned no sources. The provider may need this tool enabled on your account, or the query produced no hits.",
      );
    }

    return {
      results: harvested,
      queryUsed: summary ? `${queryUsed} — ${summary}` : queryUsed,
      provider: "openai",
    };
  }
}

export function createOpenAIWebSearch(apiKey: string): WebSearchProvider {
  return new OpenAIWebSearch(apiKey);
}
