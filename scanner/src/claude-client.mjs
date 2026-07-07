import Anthropic from "@anthropic-ai/sdk";

function createClient() {
  if (process.env.ANTHROPIC_API_KEY) {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return null;
}

export const client = createClient();
export const hasAI = client !== null;
