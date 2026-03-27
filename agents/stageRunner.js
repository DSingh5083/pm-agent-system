// agents/stageRunner.js
// Universal stage runner with LangSmith tracing.
// Every Claude/Gemini call is traced with: stage, tokens, latency, model, cost, errors.

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { getStage } from "../stageRegistry.js";
dotenv.config();

const claudeClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── LangSmith client (lazy-loaded) ────────────────────────────────────────────

let langsmithClient = null;

async function getLangSmith() {
  if (!process.env.LANGCHAIN_API_KEY) return null;
  if (langsmithClient) return langsmithClient;
  try {
    const { Client } = await import("langsmith");
    langsmithClient = new Client({
      apiKey: process.env.LANGCHAIN_API_KEY,
      apiUrl: "https://api.smith.langchain.com",
    });
    console.log("[LangSmith] client initialised");
    return langsmithClient;
  } catch (e) {
    console.warn("[LangSmith] Failed to load:", e.message);
    return null;
  }
}

// ── Cost estimator (Claude Sonnet 4 pricing) ──────────────────────────────────

function estimateCost(inputTokens, outputTokens) {
  // $3 per 1M input, $15 per 1M output
  return ((inputTokens / 1_000_000) * 3) + ((outputTokens / 1_000_000) * 15);
}

// ── Trace a run to LangSmith ──────────────────────────────────────────────────

async function traceRun({ runId, stageId, stageLabel, model, projectName, featureName, inputTokens, outputTokens, latencyMs, error }) {
  const client = await getLangSmith();
  if (!client) return;

  const project     = process.env.LANGCHAIN_PROJECT || "pm-agent-system";
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);
  const costUsd     = error ? 0 : estimateCost(inputTokens || 0, outputTokens || 0);
  const now         = Date.now();

  try {
    await client.createRun({
      id:           runId,
      name:         `${stageLabel}`,
      run_type:     "llm",
      project_name: project,
      start_time:   now - latencyMs,
      end_time:     now,
      inputs: {
        stage:       stageId,
        model,
        project:     projectName || "unknown",
        feature:     featureName || null,
      },
      outputs: error ? undefined : {
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        total_tokens:  totalTokens,
        cost_usd:      costUsd,
      },
      error: error ? String(error.message) : undefined,
      extra: {
        metadata: {
          stage_id:      stageId,
          stage_label:   stageLabel,
          model,
          project_name:  projectName || "unknown",
          feature_name:  featureName || null,
          input_tokens:  inputTokens  || 0,
          output_tokens: outputTokens || 0,
          total_tokens:  totalTokens,
          latency_ms:    latencyMs,
          cost_usd:      costUsd,
          is_error:      !!error,
          error_type:    error?.message?.includes("429") ? "rate_limit"
                       : error ? "error"
                       : null,
        },
      },
    });
  } catch (traceErr) {
    // Never let tracing break the app
    console.warn("[LangSmith] Trace write failed:", traceErr.message);
  }
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

// ── Claude runner ─────────────────────────────────────────────────────────────

async function runWithClaude(stage, prompt, context) {
  const tools = stage.useWebSearch ? [{
    type: "web_search_20250305",
    name: "web_search",
  }] : undefined;

  const MAX_RETRIES = 4;
  const BACKOFF_MS  = [15000, 30000, 60000, 120000];
  const runId       = randomUUID();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const response = await claudeClient.messages.create({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system:     AGENT_RULES,
        tools,
        messages:   [{ role: "user", content: prompt }],
      });

      const latencyMs    = Date.now() - startTime;
      const inputTokens  = response.usage?.input_tokens  || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost         = estimateCost(inputTokens, outputTokens);

      console.log(`[${stage.label}] claude · in:${inputTokens} out:${outputTokens} · ${latencyMs}ms · $${cost.toFixed(4)}`);

      traceRun({
        runId, stageId: stage.id, stageLabel: stage.label,
        model: "claude-sonnet-4-20250514",
        projectName: context?.projectName, featureName: context?.featureName,
        inputTokens, outputTokens, latencyMs, error: null,
      });

      return response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n");

    } catch (e) {
      const latencyMs = Date.now() - startTime;
      const is429 = e.status === 429 ||
                    e.message?.includes("429") ||
                    e.message?.includes("rate_limit") ||
                    e.message?.includes("rate limit") ||
                    e.message?.includes("tokens per minute");

      traceRun({
        runId, stageId: stage.id, stageLabel: stage.label,
        model: "claude-sonnet-4-20250514",
        projectName: context?.projectName, featureName: context?.featureName,
        inputTokens: 0, outputTokens: 0, latencyMs, error: e,
      });

      if (is429 && attempt < MAX_RETRIES) {
        const retryMatch = e.message?.match(/retry[^0-9]*(\d+)/i);
        const retryAfter = retryMatch
          ? parseInt(retryMatch[1]) * 1000 + 2000
          : BACKOFF_MS[attempt];
        console.warn(`[stageRunner] 429 attempt ${attempt + 1}/${MAX_RETRIES + 1} — waiting ${Math.round(retryAfter / 1000)}s...`);
        await sleep(retryAfter);
        continue;
      }
      throw e;
    }
  }
}

// ── Gemini runner ─────────────────────────────────────────────────────────────

async function runWithGemini(stage, prompt, context) {
  if (!geminiClient) throw new Error("GEMINI_API_KEY is not set.");

  const model     = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash" }, { apiVersion: "v1beta" });
  const runId     = randomUUID();
  const startTime = Date.now();

  try {
    const result = await model.generateContent({
      contents:         [{ role: "user", parts: [{ text: prompt }] }],
      tools:            [{ googleSearch: {} }],
      generationConfig: { maxOutputTokens: 4000 },
    });

    const latencyMs    = Date.now() - startTime;
    const inputTokens  = result.response.usageMetadata?.promptTokenCount     || 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;

    console.log(`[${stage.label}] gemini · in:${inputTokens} out:${outputTokens} · ${latencyMs}ms`);

    traceRun({
      runId, stageId: stage.id, stageLabel: stage.label,
      model: "gemini-2.0-flash",
      projectName: context?.projectName, featureName: context?.featureName,
      inputTokens, outputTokens, latencyMs, error: null,
    });

    return result.response.text();

  } catch (e) {
    const latencyMs = Date.now() - startTime;
    traceRun({
      runId, stageId: stage.id, stageLabel: stage.label,
      model: "gemini-2.0-flash",
      projectName: context?.projectName, featureName: context?.featureName,
      inputTokens: 0, outputTokens: 0, latencyMs, error: e,
    });
    throw e;
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
    text = await runWithGemini(stage, prompt, context);
  } else {
    text = await runWithClaude(stage, prompt, context);
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