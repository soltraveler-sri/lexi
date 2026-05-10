export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceDate?: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  queryUsed: string;
  provider: string;
}

export interface WebSearchOptions {
  maxResults?: number;
  signal?: AbortSignal;
}

export interface WebSearchProvider {
  id: "anthropic" | "openai";
  name: string;
  isAvailable(): boolean;
  search(
    query: string,
    options?: WebSearchOptions,
  ): Promise<WebSearchResponse>;
}

export interface WebSearchCredential {
  apiKey: string;
  ownership: "user" | "app";
}
