import Anthropic from "@anthropic-ai/sdk";

function createClient() {
  if (process.env.ANTHROPIC_API_KEY) {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  throw new Error("Set ANTHROPIC_API_KEY environment variable.");
}

export const client = createClient();
