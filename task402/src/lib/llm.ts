import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getLlmMode, serverConfig } from "./config";

export function llmLabel(): string {
  if (getLlmMode() === "mock") return "deterministic mock";
  return serverConfig.llmProvider === "anthropic"
    ? serverConfig.llmModel ?? "claude-3-5-sonnet-latest"
    : serverConfig.llmModel ?? "gpt-4o-mini";
}

export async function complete(system: string, prompt: string): Promise<string> {
  if (getLlmMode() === "mock") {
    return `__MOCK__`; // callers provide their own deterministic fallback
  }
  try {
    if (serverConfig.llmProvider === "anthropic") {
      const anthropic = createAnthropic({ apiKey: serverConfig.anthropicKey });
      const { text } = await generateText({
        model: anthropic(serverConfig.llmModel ?? "claude-3-5-sonnet-latest"),
        system,
        prompt,
      });
      return text;
    }
    const openai = createOpenAI({ apiKey: serverConfig.openaiKey });
    const { text } = await generateText({
      model: openai(serverConfig.llmModel ?? "gpt-4o-mini"),
      system,
      prompt,
    });
    return text;
  } catch {
    return `__MOCK__`;
  }
}
