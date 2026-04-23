import { anthropicFactory } from "@/lib/ai/providers/anthropic";
import { openaiFactory } from "@/lib/ai/providers/openai";
import { stubFactory } from "@/lib/ai/providers/stub";
import type { AIProviderFactory } from "@/lib/ai/types";

export const providerFactories = new Map<string, AIProviderFactory>([
  [stubFactory.id, stubFactory],
  [anthropicFactory.id, anthropicFactory],
  [openaiFactory.id, openaiFactory],
]);

export function getProviderFactory(providerId: string) {
  return providerFactories.get(providerId) ?? stubFactory;
}
