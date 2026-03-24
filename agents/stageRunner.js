// agents/stageRunner.js
// Universal stage runner. Context is pre-built by server.js before this is called.
//
// Model routing:
//   model: "gemini"  → Gemini 2.0 Flash (kept for future use, no stages use it currently)
//   default          → Claude Sonnet with retry + exponential backoff on 429

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { getStage } from "../stageRegistry.js";
dotenv.config();

const claudeClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Gemini runner — kept for future use ──────────────────────────────────────
async function runWithGemini(stage, prompt) {
  if (!geminiClient) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  const model = geminiClient.getGenerativeModel(
    { model: "gemini-2.0-flash" },
    { apiVersion: "v1beta" }
  );
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { maxOutputTokens: 4000 },
  });
  return result.response.text();
}

// ── Agent rules ───────────────────────────────────────────────────────────────
const AGENT_RULES = `
You are a Senior Product Architect Agent. Direct, analytical, and slightly skeptical.
Your job is to make the product better, not just agree with the user.

Rules:
- Use the "Jobs to be Done" (JTBD) framework for all user stories: "When [situation], I want to [motivation], so I can [outcome]."
- Every PRD and feature spec must begin with a "TL;DR" executive summary (2-3 sentences max).
- Every feature output must end with a "## Friction Check" section listing exactly 3 risks:
  one Technical Debt risk, one UX Friction risk, one Low Adoption risk.
- Never invent market share percentages or statistics. If data is unavailable, write "Data Not Found."
- All external claims must include a [Source URL] or be flagged as [Unverified].
- Be specific. Use actual product names, user segments, and metrics from the project context.
- Challenge vague goals. If something is unclear or risky, say so directly.
`.trim();

// ── Sleep helper ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Claude runner with 429 retry + exponential backoff ────────────────────────
async function runWithClaude(stage, prompt) {
  const tools = stage.useWebSearch ? [{
    type: "web_search_20250305",
    name: "web_search",
  }] : undefined;

  const MAX_RETRIES = 4;
  // Backoff: 15s, 30s, 60s, 120s
  const BACKOFF_MS  = [15000, 30000, 60000, 120000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await claudeClient.messages.create({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system:     AGENT_RULES,
        tools,
        messages:   [{ role: "user", content: prompt }],
      });

      return response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n");

    } catch (e) {
      const is429 = e.status === 429 ||
                    e.message?.includes("429") ||
                    e.message?.includes("rate_limit") ||
                    e.message?.includes("rate limit") ||
                    e.message?.includes("tokens per minute");

      if (is429 && attempt < MAX_RETRIES) {
        // Try to extract retry-after from error message e.g. "retry in 47s"
        const retryMatch = e.message?.match(/retry[^0-9]*(\d+)/i);
        const retryAfter = retryMatch
          ? parseInt(retryMatch[1]) * 1000 + 2000   // suggested wait + 2s buffer
          : BACKOFF_MS[attempt];

        console.warn(
          `[stageRunner] 429 rate limit on attempt ${attempt + 1}/${MAX_RETRIES + 1} ` +
          `for stage "${stage.label}". Waiting ${Math.round(retryAfter / 1000)}s before retry...`
        );

        await sleep(retryAfter);
        continue;
      }

      // Non-429 or out of retries — rethrow
      throw e;
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function runStage(stageId, context) {
  const stage = getStage(stageId);
  if (!stage) throw new Error("Unknown stage: " + stageId);

  console.log(`Running stage: ${stage.label} [${stage.model || "claude"}]`);

  const prompt = stage.prompt(context);

  let text;
  if (stage.model === "gemini") {
    text = await runWithGemini(stage, prompt);
  } else {
    text = await runWithClaude(stage, prompt);
  }

  if (stage.renderer === "tickets") {
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch {
      throw new Error("Tickets stage returned invalid JSON — try again");
    }
  }

  console.log(`Stage complete: ${stage.label}`);
  return text;
}