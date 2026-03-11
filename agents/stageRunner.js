// agents/stageRunner.js
// Universal stage runner. Context is pre-built by server.js before this is called.
// This just executes the prompt — all context enrichment happens upstream.

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { getStage } from "../stageRegistry.js";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runStage(stageId, context) {
  const stage = getStage(stageId);
  if (!stage) throw new Error("Unknown stage: " + stageId);

  console.log("Running stage: " + stage.label);

  const prompt = stage.prompt(context);

  const tools = stage.useWebSearch ? [{
    type: "web_search_20250305",
    name: "web_search",
  }] : undefined;

  const response = await client.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 6000,
    tools,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  if (stage.renderer === "tickets") {
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch {
      throw new Error("Tickets stage returned invalid JSON — try again");
    }
  }

  console.log("Stage complete: " + stage.label);
  return text;
}
