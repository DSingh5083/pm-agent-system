import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { initDb, projectsDb, constraintsDb, projectOutputsDb, featuresDb, featureOutputsDb, chatDb, docsDb } from "./db.js";
import { runStage } from "./agents/stageRunner.js";
import { getStage } from "./stageRegistry.js";

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// OpenAI client (Agent B — The Skeptic)
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  const { default: OpenAI } = await import("openai");
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS: " + origin));
  },
  methods: ["POST", "GET", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "10mb" }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatConstraints(constraints) {
  if (!constraints || constraints.length === 0) return "";
  const lines = constraints.map(c =>
    `${c.severity.toUpperCase()}: [${c.type}] ${c.title} — ${c.description}`
  );
  return `PROJECT CONSTRAINTS (must be respected in all feature work):\n${lines.join("\n")}`;
}

// ── Agent Rules ───────────────────────────────────────────────────────────────

const AGENT_RULES = `
## Role
You are a Senior Product Architect Agent. Your goal is to move from a "messy thought" to a high-fidelity Project Brief and PRD. You are direct, analytical, and slightly skeptical. Your job is to make the product better, not just agree with the user.

## Framework
- Use the "Jobs to be Done" (JTBD) framework for all user stories: "When [situation], I want to [motivation], so I can [outcome]."
- Every PRD and feature spec must include a "TL;DR" executive summary at the top.
- Every feature output must end with a "Friction Check" — 3 reasons this feature might fail: Technical Debt risk, UX Friction risk, or Low Adoption risk.

## Research Standards
- Never invent market share percentages, user statistics, or pricing data. If data is unavailable, state "Data Not Found."
- All external claims must include a [Source URL] or be flagged as [Unverified].
- When competitor or market data is present in context, reference it explicitly rather than making generic statements.

## Output Quality
- Be specific. Use actual product names, user segments, and metrics from the project context.
- Challenge assumptions. If a feature or goal seems vague or risky, say so directly.
- Prioritise ruthlessly. Not everything deserves to be built.
`.trim();


// ── Google Programmable Search Engine ────────────────────────────────────────

async function googlePSESearch(query, options = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx     = process.env.GOOGLE_PSE_CX;

  if (!apiKey || !cx) {
    console.warn("Google PSE not configured — GOOGLE_API_KEY or GOOGLE_PSE_CX missing");
    return [];
  }

  const params = new URLSearchParams({
    key:        apiKey,
    cx,
    q:          query,
    num:        options.num        || 5,
    dateRestrict: options.dateRestrict || "y1",  // last 1 year by default
    ...(options.sort ? { sort: options.sort } : {}),
  });

  try {
    const res  = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    const data = await res.json();
    if (data.error) {
      console.error("PSE error:", data.error.message);
      return [];
    }
    return (data.items || []).map(item => ({
      title:   item.title,
      url:     item.link,
      snippet: item.snippet,
    }));
  } catch (e) {
    console.error("PSE fetch error:", e.message);
    return [];
  }
}

// Identify product category from brief text using Claude, then search for trends
async function searchTrendsForBrief(briefText) {
  // Step 1: extract product category
  const catRes = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 60,
    messages: [{
      role: "user",
      content: `Extract the core product category from this brief in 3-5 words. Return ONLY the category, nothing else.\n\n${briefText}`
    }],
  });
  const category = catRes.content[0].text.trim();

  // Step 2: search for 2025-2026 trend articles
  const query   = `${category} trends 2025 2026`;
  const results = await googlePSESearch(query, { num: 3, dateRestrict: "m18" });

  return { category, results };
}

// Serialise a context value — arrays/objects as JSON, strings as-is
function serialise(val) {
  if (typeof val === "string") return val;
  return JSON.stringify(val, null, 2);
}

// Rough token estimator — 1 token ~ 4 chars
function estimateTokens(str) { return Math.ceil((str || "").length / 4); }

const META_KEYS = new Set(["projectName","projectDescription","featureName","featureDescription","constraints","briefing","interviewAnswers"]);
const STAGE_NEEDS = {
  competitor:      [],
  market_analysis: ["competitor"],
  roadmap:         ["competitor", "market_analysis"],
  gtm:             ["competitor", "market_analysis", "roadmap"],
  prd:             ["competitor", "market_analysis"],
  architecture:    ["prd"],
  flow:            ["prd", "architecture"],
  ui_spec:         ["prd", "flow"],
  diagram:         ["architecture", "flow"],
  review:          ["prd", "architecture", "flow", "ui_spec"],
  tickets:         ["prd", "architecture", "review"],
};

function buildContextBlock(ctx, stageId) {
  const parts = [];
  if (ctx.projectName)        parts.push("PROJECT: " + ctx.projectName);
  if (ctx.projectDescription) parts.push("DESCRIPTION: " + ctx.projectDescription);
  if (ctx.featureName)        parts.push("FEATURE: " + ctx.featureName);
  if (ctx.featureDescription) parts.push("FEATURE DESCRIPTION: " + ctx.featureDescription);
  if (ctx.constraints)        parts.push(ctx.constraints);

  const needed      = stageId ? (STAGE_NEEDS[stageId] || []) : [];
  const allKeys     = Object.keys(ctx).filter(k => !META_KEYS.has(k));
  const relevantKeys = needed.length > 0 ? allKeys.filter(k => needed.includes(k)) : allKeys;

  if (relevantKeys.length > 0) {
    const TOKEN_BUDGET = 60000;
    let usedTokens = estimateTokens(parts.join("\n"));
    const priorParts = [];

    for (const k of relevantKeys) {
      const label   = getStage(k)?.label?.toUpperCase() || k.toUpperCase();
      const raw     = serialise(ctx[k]);
      const tokens  = estimateTokens(raw);
      const allowed = TOKEN_BUDGET - usedTokens;
      if (allowed <= 500) break;
      const text = tokens <= allowed ? raw : raw.slice(0, allowed * 4) + "\n...[truncated for context window]";
      priorParts.push(`\n${label}:\n${text}`);
      usedTokens += estimateTokens(text);
    }

    if (priorParts.length > 0) {
      parts.push("\n── PRIOR WORK ──");
      parts.push(...priorParts);
    }
  }

  if (ctx.briefing)         parts.push("\n── CONTEXT BRIEFING ──\n" + ctx.briefing);
  if (ctx.interviewAnswers) parts.push("\n── CLARIFYING ANSWERS FROM USER ──\n" + ctx.interviewAnswers);

  return parts.join("\n");
}

async function buildProjectContext(projectId, project, stageId) {
  const [outputs, constraints] = await Promise.all([
    projectOutputsDb.getAll(projectId),
    constraintsDb.getAllForProject(projectId),
  ]);
  const ctx = {
    projectName:        project.name,
    projectDescription: project.description,
    constraints:        formatConstraints(constraints),
  };
  outputs.forEach(o => {
    try { ctx[o.stage_id] = JSON.parse(o.content); }
    catch { ctx[o.stage_id] = o.content; }
  });
  return ctx;
}

async function buildFeatureContext(featureId, feature, project, stageId) {
  const [featureOutputs, projectOutputs, constraints] = await Promise.all([
    featureOutputsDb.getAll(featureId),
    projectOutputsDb.getAll(feature.project_id),
    constraintsDb.getAllForProject(feature.project_id),
  ]);
  const ctx = {
    projectName:        project.name,
    projectDescription: project.description,
    featureName:        feature.name,
    featureDescription: feature.description,
    constraints:        formatConstraints(constraints),
  };
  projectOutputs.forEach(o => {
    try { ctx[o.stage_id] = JSON.parse(o.content); }
    catch { ctx[o.stage_id] = o.content; }
  });
  featureOutputs.forEach(o => {
    try { ctx[o.stage_id] = JSON.parse(o.content); }
    catch { ctx[o.stage_id] = o.content; }
  });
  return ctx;
}

async function generateInterviewQuestions(stageId, ctx) {
  const stage = getStage(stageId);
  const contextBlock = buildContextBlock(ctx, stageId);

  const prompt = `You are a senior PM preparing to generate a ${stage.label} for a product team.

Before generating, you need to ask 3-5 sharp clarifying questions that would significantly improve the quality and specificity of the output.

CURRENT CONTEXT:
${contextBlock}

Rules for your questions:
- Only ask what is NOT already answered in the context above
- Each question must be specific to THIS stage (${stage.label}) and THIS product
- Ask about things that would make the output generic if unknown
- No fluff questions — every question must materially change the output
- If the context is already rich enough for a specific question, skip it

Return ONLY a JSON array of question strings. No preamble, no markdown fences.
Example: ["What is the primary monetisation model?", "Who is the decision maker in the buying process?"]`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text.trim();
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    const lines = text.split("\n").filter(l => l.includes("?")).map(l => l.replace(/^[-*\d.]\s*/, "").trim());
    return lines.length > 0 ? lines : ["What specific problem does this solve for the user?", "What does success look like in 3 months?"];
  }
}

async function distillContext(stageId, ctx) {
  const stage = getStage(stageId);
  const stageKeys = Object.keys(ctx).filter(k =>
    !["projectName","projectDescription","featureName","featureDescription","constraints","briefing","interviewAnswers"].includes(k)
  );

  if (stageKeys.length === 0) return null;

  const TOKEN_CAP_PER_STAGE = 12000;
  const priorWork = stageKeys.map(k => {
    const label = getStage(k)?.label || k;
    const raw   = serialise(ctx[k]);
    const text  = raw.length > TOKEN_CAP_PER_STAGE ? raw.slice(0, TOKEN_CAP_PER_STAGE) + "\n...[truncated]" : raw;
    return `${label.toUpperCase()}:\n${text}`;
  }).join("\n\n");

  const prompt = `You are preparing a structured briefing for a ${stage.label} generation.

PRODUCT: ${ctx.projectName}
${ctx.featureName ? "FEATURE: " + ctx.featureName : ""}

PRIOR WORK COMPLETED:
${priorWork}

Create a tight briefing that extracts the most important context for writing a ${stage.label}. Include:

## Key Decisions Already Made
## Established Facts
## What's Already Ruled Out
## Critical Gaps

Be specific. Use actual names, numbers, and terms from the prior work. No generic statements.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].text;
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ ok: true }));

// ── DISCOVERY INTERVIEW ───────────────────────────────────────────────────────

app.post("/projects/:id/discovery-interview", async (req, res) => {
  try {
    const project = await projectsDb.getById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: AGENT_RULES,
      messages: [{
        role: "user",
        content: `A product team has just created a new project called: "${project.name}"
${project.description ? "Initial description: " + project.description : "No description yet."}

Run Step 1 of your process: ask 3-5 pointed, non-obvious questions to clarify the "Why," the "User Pain," and the "Technical Constraints" before any work begins.

Do NOT ask generic questions like "who is your target audience?" — ask questions that would materially change the product direction if answered differently.

Return ONLY a JSON array of question strings. No preamble, no markdown fences.`
      }],
    });

    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    try {
      res.json({ questions: JSON.parse(text) });
    } catch {
      const lines = text.split("\n").filter(l => l.includes("?")).map(l => l.replace(/^[-*"\d.\s]+/, "").replace(/",?$/, "").trim());
      res.json({ questions: lines.length > 0 ? lines : [text] });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── IMPROVE BRIEF ─────────────────────────────────────────────────────────────

app.post("/improve-brief", async (req, res) => {
  try {
    const { brief } = req.body;
    if (!brief?.trim()) return res.status(400).json({ error: "Brief required" });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `You are a senior product strategist. Rewrite the following rough product brief into a clear, structured, and compelling description that will be used as context for AI-generated product documents.

ORIGINAL BRIEF:
${brief}

Rules:
- Keep ALL the same information — do not invent anything new
- Structure it clearly: what the product is, who it's for, what problem it solves, the business goal, and tech stack if mentioned
- Write in clear, professional prose — 3 to 5 sentences maximum
- Remove filler words, vague statements, and repetition
- Make every sentence earn its place — be specific

Return only the improved brief text, no preamble, no labels, no markdown.`
      }],
    });

    res.json({ improved: response.content[0].text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SEMANTIC SORT ─────────────────────────────────────────────────────────────

app.post("/semantic-sort", async (req, res) => {
  try {
    const notes = req.body.notes || req.body.input;
    if (!notes?.trim()) return res.status(400).json({ error: "Notes required" });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are a product analyst. Categorise every distinct idea, complaint, or requirement from these raw notes into exactly four buckets.

RAW NOTES:
${notes}

BUCKETS:
- pain: User problems, frustrations, complaints, unmet needs
- feature: Proposed solutions, product ideas, capabilities
- tech: Technical requirements, constraints, integrations, compliance, "must use X", "no-go Y"
- vibe: Emotional goals, strategic north stars, success feelings, brand direction

Rules:
- Split compound sentences into separate items
- Every item must go in exactly one bucket — pick the best fit
- Keep items as short, clear sentences
- If a note has no clear category, put it in vibe

Return ONLY a JSON object with keys: pain, feature, tech, vibe — each an array of strings.
No preamble, no markdown fences, no explanation.`
      }],
    });

    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    res.json({ buckets: JSON.parse(text) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/semantic-enhancements", async (req, res) => {
  try {
    const { buckets } = req.body;
    const painItems  = (buckets.pain    || []).join("\n");
    const techItems  = (buckets.tech    || []).join("\n");
    const vibeItems  = (buckets.vibe    || []).join("\n");
    const allBuckets = Object.values(buckets).flat().join(" ");

    // PSE: search for tools/APIs that solve the pain
    const searchQuery = `tools APIs solutions for: ${painItems.slice(0, 200)}`;
    const [pseResults, trendsData] = await Promise.all([
      googlePSESearch(searchQuery, { num: 5 }),
      searchTrendsForBrief(allBuckets),
    ]);

    // Claude synthesises PSE results into actionable enhancements + trend insights
    const pseBlock = pseResults.length
      ? "SEARCH RESULTS:\n" + pseResults.map(r => `- ${r.title}: ${r.snippet} [${r.url}]`).join("\n")
      : "No search results available.";

    const trendsBlock = trendsData.results.length
      ? "TREND ARTICLES (2025-2026):\n" + trendsData.results.map(r => `- ${r.title}: ${r.snippet} [${r.url}]`).join("\n")
      : "No trend articles found.";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are a product researcher. Analyse these search results and extract 3 actionable enhancements for a product with these characteristics:

USER PAIN: ${painItems || "None"}
TECH CONSTRAINTS: ${techItems || "None"}
GOALS: ${vibeItems || "None"}

${pseBlock}

${trendsBlock}

Return a JSON object with two keys:
1. "enhancements": array of exactly 3 objects with: title, description (how it solves the pain), url (source link)
2. "googleSearchInsights": array of 3 objects with: headline, summary (1-2 sentences), url — based on the trend articles above

Return ONLY the JSON, no preamble, no markdown fences.`
      }],
    });

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim().replace(/\`\`\`json|\`\`\`/g, "").trim();
    const parsed = JSON.parse(text);
    res.json({
      enhancements:         parsed.enhancements || [],
      googleSearchInsights: parsed.googleSearchInsights || [],
      productCategory:      trendsData.category,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/generate-brief", async (req, res) => {
  try {
    const { buckets, enhancements } = req.body;

    const enhancementBlock = enhancements?.length
      ? "\n\nSUGGESTED ENHANCEMENTS FROM RESEARCH:\n" + enhancements.map(e => `- ${e.title}: ${e.description}${e.url ? " [" + e.url + "]" : ""}`).join("\n")
      : "";

    const insightsBlock = req.body.googleSearchInsights?.length
      ? "\n\nGOOGLE SEARCH INSIGHTS (2025-2026 trends):\n" + req.body.googleSearchInsights.map(i => `- ${i.headline}: ${i.summary} [${i.url}]`).join("\n")
      : "";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `You are a senior product strategist. Write a structured project brief from these categorised inputs.

USER PAIN (the Why):
${(buckets.pain || []).map(i => "- " + i).join("\n") || "None"}

FEATURE IDEAS (the What):
${(buckets.feature || []).map(i => "- " + i).join("\n") || "None"}

TECHNICAL CONSTRAINTS (the How boundaries):
${(buckets.tech || []).map(i => "- " + i).join("\n") || "None"}

VIBE / GOALS (the North Star):
${(buckets.vibe || []).map(i => "- " + i).join("\n") || "None"}
${enhancementBlock}${insightsBlock}

Write a clear, professional project brief in flowing prose — 4 to 6 sentences.
Structure it as: What + Why (from pain) → What we're building (from features) → How we'll do it (from tech + enhancements) → What success looks like (from vibe).
Be specific. Use the actual details from the inputs. Do not use headers or bullet points.
After the main brief paragraph, add a section titled "## Google Search Insights" that summarises the 2025-2026 trend data above in 3 bullet points. If no trend data is available, omit this section.
Return only the brief text with the optional insights section.`
      }],
    });

    res.json({ brief: response.content[0].text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// RESEARCH — PSE-powered research for "Research this" chat trigger
app.post("/research", async (req, res) => {
  try {
    const { query, projectId } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: "Query required" });

    // Run PSE search
    const results = await googlePSESearch(query, { num: 5, dateRestrict: "m12" });

    if (!results.length) {
      return res.json({ summary: "No results found via Google Search for: " + query, results: [] });
    }

    // Claude summarises results
    const resultsBlock = results.map((r, i) =>
      `[${i+1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
    ).join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: AGENT_RULES,
      messages: [{
        role: "user",
        content: `Summarise these Google search results about "${query}" for a product team.

${resultsBlock}

Write a concise research summary (3-5 bullet points). For each point cite the source as [Source: URL].
Never invent data not present in the results. If something is missing, say "Data Not Found."
Start with a one-line TL;DR.`
      }],
    });

    res.json({
      summary: response.content[0].text.trim(),
      results,
      query,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DOCS ──────────────────────────────────────────────────────────────────────

app.get("/projects/:id/docs", async (req, res) => {
  try { res.json(await docsDb.getAllForProject(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/docs/:id", async (req, res) => {
  try {
    const doc = await docsDb.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Doc not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects/:id/docs/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt required" });

    const project = await projectsDb.getById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const ctx = await buildProjectContext(req.params.id, project);

    let featureContext = "";
    if (req.body.featureId) {
      const feature = await featuresDb.getById(req.body.featureId);
      if (feature) {
        const fOutputs = await featureOutputsDb.getAll(feature.id);
        featureContext = "\n\nACTIVE FEATURE: " + feature.name;
        if (feature.description) featureContext += "\n" + feature.description;
        fOutputs.forEach(o => {
          featureContext += "\n\n" + (getStage(o.stage_id)?.label || o.stage_id).toUpperCase() + ":\n" + o.content;
        });
      }
    }

    const contextBlock = buildContextBlock(ctx) + featureContext;

    const systemPrompt = `${AGENT_RULES}

You also have full context about this project:
${contextBlock}

Additional rules for document generation:
- Use ONLY information from the project context above — never invent names, dates, metrics, or details
- If a specific detail is not in context, write [TBD] as a placeholder
- Format output as clean Markdown with proper headers (##, ###), bullet lists, tables, and checkboxes (- [ ])`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0].text;
    const titleMatch = content.match(/^#+ (.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : prompt.slice(0, 60);

    const doc = await docsDb.create(randomUUID(), req.params.id, title, prompt, content);
    res.json(doc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/docs/:id/export-docx", async (req, res) => {
  try {
    const doc = await docsDb.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Doc not found" });

    const { execSync } = await import("child_process");
    const { writeFileSync, readFileSync, unlinkSync } = await import("fs");
    const { join } = await import("path");
    const os = await import("os");

    const tmpDir     = os.tmpdir();
    const scriptPath = join(tmpDir, "gen_doc_" + Date.now() + ".js");
    const outPath    = join(tmpDir, "export_" + Date.now() + ".docx");

    const buildPrompt = `You are converting this Markdown document to a Node.js script that generates a .docx file using the 'docx' npm package.

DOCUMENT TITLE: ${doc.title}

MARKDOWN CONTENT:
${doc.content}

Write a complete Node.js CJS script (require, not import) that:
1. Uses: const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat } = require('docx');
2. Creates a professional .docx matching the markdown structure
3. Maps ## to HeadingLevel.HEADING_1, ### to HeadingLevel.HEADING_2
4. Uses proper numbering config for bullet lists (LevelFormat.BULLET, never unicode bullets)
5. Renders tables with columnWidths, ShadingType.CLEAR, dual widths
6. Uses US Letter page size (width:12240, height:15840 DXA), 1 inch margins
7. Writes output to: ${outPath}
8. Ends with: Packer.toBuffer(doc).then(b => { require('fs').writeFileSync('${outPath}', b); console.log('done'); });

Return ONLY the Node.js script, no explanation, no markdown fences.`;

    const genRes = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: buildPrompt }],
    });

    let script = genRes.content[0].text.trim();
    script = script.replace(/^```(javascript|js)?\n?/i, "").replace(/```$/, "").trim();

    writeFileSync(scriptPath, script);
    execSync("node " + scriptPath, { timeout: 30000 });

    const docxBuffer = readFileSync(outPath);
    unlinkSync(scriptPath);
    unlinkSync(outPath);

    const safeTitle = doc.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.docx"`);
    res.send(docxBuffer);
  } catch (e) {
    console.error("DOCX export error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.patch("/docs/:id", async (req, res) => {
  try {
    await docsDb.update(req.params.id, req.body.title, req.body.content);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/docs/:id", async (req, res) => {
  try { await docsDb.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROJECTS ──────────────────────────────────────────────────────────────────

app.get("/projects", async (req, res) => {
  try { res.json(await projectsDb.getAll()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects", async (req, res) => {
  try {
    const { name, description = "" } = req.body;
    const id = randomUUID();
    await projectsDb.create(id, name, description);
    res.json(await projectsDb.getById(id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/projects/:id", async (req, res) => {
  try {
    await projectsDb.update(req.params.id, req.body.name, req.body.description ?? "");
    res.json(await projectsDb.getById(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/projects/:id", async (req, res) => {
  try { await projectsDb.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CONSTRAINTS ───────────────────────────────────────────────────────────────

app.get("/projects/:id/constraints", async (req, res) => {
  try { res.json(await constraintsDb.getAllForProject(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects/:id/constraints", async (req, res) => {
  try {
    const { type, title, description, severity } = req.body;
    const c = await constraintsDb.create(randomUUID(), req.params.id, type, title, description, severity);
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/constraints/:id", async (req, res) => {
  try {
    await constraintsDb.update(req.params.id, req.body.type, req.body.title, req.body.description, req.body.severity);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/constraints/:id", async (req, res) => {
  try { await constraintsDb.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROJECT OUTPUTS ───────────────────────────────────────────────────────────

app.get("/projects/:id/outputs", async (req, res) => {
  try {
    const outputs = await projectOutputsDb.getAll(req.params.id);
    const map = {};
    outputs.forEach(o => {
      try { map[o.stage_id] = JSON.parse(o.content); }
      catch { map[o.stage_id] = o.content; }
    });
    res.json(map);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects/:id/interview/:stageId", async (req, res) => {
  try {
    const project = await projectsDb.getById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const ctx       = await buildProjectContext(req.params.id, project);
    const questions = await generateInterviewQuestions(req.params.stageId, ctx);
    res.json({ questions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects/:id/run/:stageId", async (req, res) => {
  try {
    const project = await projectsDb.getById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const ctx = await buildProjectContext(req.params.id, project);
    if (req.body.interviewAnswers) ctx.interviewAnswers = req.body.interviewAnswers;

    // For competitor stage — pre-fetch PSE results to ground Gemini analysis
    if (req.params.stageId === "competitor" && project.description) {
      const searchQuery = `${project.name} competitors alternatives 2025 2026`;
      const pseResults  = await googlePSESearch(searchQuery, { num: 5, dateRestrict: "m12" });
      if (pseResults.length) {
        ctx.pseResults = pseResults.map((r, i) =>
          `[${i+1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
        ).join("\n\n");
      }
    }

    const briefing = await distillContext(req.params.stageId, ctx);
    if (briefing) ctx.briefing = briefing;

    const result = await runStage(req.params.stageId, ctx);
    const stored = typeof result === "string" ? result : JSON.stringify(result);
    await projectOutputsDb.save(randomUUID(), req.params.id, req.params.stageId, stored);
    res.json({ result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FEATURES ──────────────────────────────────────────────────────────────────

app.get("/projects/:id/features", async (req, res) => {
  try { res.json(await featuresDb.getAllForProject(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects/:id/features", async (req, res) => {
  try {
    const feature = await featuresDb.create(randomUUID(), req.params.id, req.body.name, req.body.description || "");
    res.json(feature);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/features/:id", async (req, res) => {
  try {
    await featuresDb.update(req.params.id, req.body.name, req.body.description ?? "");
    res.json(await featuresDb.getById(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/features/:id", async (req, res) => {
  try { await featuresDb.delete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FEATURE OUTPUTS ───────────────────────────────────────────────────────────

app.get("/features/:id/outputs", async (req, res) => {
  try {
    const outputs = await featureOutputsDb.getAll(req.params.id);
    const map = {};
    outputs.forEach(o => {
      try { map[o.stage_id] = JSON.parse(o.content); }
      catch { map[o.stage_id] = o.content; }
    });
    res.json(map);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/features/:id/interview/:stageId", async (req, res) => {
  try {
    const feature = await featuresDb.getById(req.params.id);
    if (!feature) return res.status(404).json({ error: "Feature not found" });
    const project   = await projectsDb.getById(feature.project_id);
    const ctx       = await buildFeatureContext(req.params.id, feature, project);
    const questions = await generateInterviewQuestions(req.params.stageId, ctx);
    res.json({ questions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/features/:id/run/:stageId", async (req, res) => {
  try {
    const feature = await featuresDb.getById(req.params.id);
    if (!feature) return res.status(404).json({ error: "Feature not found" });
    const project = await projectsDb.getById(feature.project_id);

    const ctx = await buildFeatureContext(req.params.id, feature, project, req.params.stageId);
    if (req.body.interviewAnswers) ctx.interviewAnswers = req.body.interviewAnswers;

    const briefing = await distillContext(req.params.stageId, ctx);
    if (briefing) ctx.briefing = briefing;

    const result = await runStage(req.params.stageId, ctx);
    const stored = typeof result === "string" ? result : JSON.stringify(result);
    await featureOutputsDb.save(randomUUID(), req.params.id, req.params.stageId, stored);
    res.json({ result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CODE-READY PRD ──────────────────────────────────────────────────────────────

app.post("/features/:id/code-ready-prd", async (req, res) => {
  try {
    const feature = await featuresDb.getById(req.params.id);
    if (!feature) return res.status(404).json({ error: "Feature not found" });

    const project = await projectsDb.getById(feature.project_id);
    const [featureOutputs, constraints] = await Promise.all([
      featureOutputsDb.getAll(feature.id),
      constraintsDb.getAllForProject(feature.project_id),
    ]);

    const prdOutput = featureOutputs.find(o => o.stage_id === "prd");
    if (!prdOutput) return res.status(400).json({ error: "Run the PRD stage first." });

    const { screenshots = [] } = req.body; // base64 images array

    const constraintBlock = formatConstraints(constraints);

    // Build message content — text + optional images
    const messageContent = [];

    // Add screenshots as vision inputs
    screenshots.forEach((img, i) => {
      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType || "image/png",
          data: img.data,
        },
      });
    });

    // Add the main prompt
    messageContent.push({
      type: "text",
      text: `You are a Senior Technical Product Manager and Software Architect.

${screenshots.length > 0 ? `I have provided ${screenshots.length} UI screenshot(s) above showing the already-built interface.` : "No UI screenshots provided — base the technical PRD on the General PRD below."}

PRODUCT: ${project.name}
${project.description ? "PROJECT BRIEF: " + project.description : ""}

FEATURE: ${feature.name}
${feature.description ? "FEATURE CONTEXT: " + feature.description : ""}

${constraintBlock}

GENERAL PRD:
${prdOutput.content}

Convert the above into a Code-Ready PRD for engineering execution. Follow these rules:
- Do NOT suggest new UI changes. Stick strictly to the provided screenshots and PRD.
- Focus 100% on wiring and logic, not design.

Structure your output with exactly these 5 sections using ## headers:

## 1. Component-to-Logic Mapping
For every interactive element visible in the UI, define:
- The element name and its frontend event (onClick, onChange, onSubmit, etc.)
- The corresponding backend action (API endpoint, data mutation, state change)
Format as a table: | Element | Event | Backend Action | Notes |

## 2. Technical Contract
For every API endpoint mentioned or implied:
- Endpoint path and HTTP method
- Exact JSON Request schema with field types and validation rules
- Exact JSON Response schema (success and error)
- HTTP status codes

## 3. State Machine Definition
Define all UI lifecycle states for this feature:
- Idle: what the user sees before any action
- Loading/Processing: visual changes during async operations
- Success: what changes after successful completion
- Error: what the user sees and can do on failure
Be specific — name actual UI elements that change in each state.

## 4. Edge Case Matrix
Identify exactly 3 technical failure points. For each:
- Failure name (e.g. Network Timeout)
- Trigger condition
- UI response (what the user sees)
- Recovery action (what the user can do)
Format as a table.

## 5. Atomic Implementation Plan
Break the build into 5-8 sequential tasks. Each task must:
- Be executable by a coding agent in under 15 minutes
- Have a single clear deliverable
- Be independently testable
Format as numbered list: Task N — [name]: [description] → Deliverable: [what exists when done]`
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      system: AGENT_RULES,
      messages: [{ role: "user", content: messageContent }],
    });

    const prdContent = response.content[0].text.trim();

    // Save as stage_id "code_ready_prd"
    await featureOutputsDb.save(randomUUID(), feature.id, "code_ready_prd", prdContent);

    res.json({ content: prdContent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/features/:id/code-ready-prd/save", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    await featureOutputsDb.save(randomUUID(), req.params.id, "code_ready_prd", content);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CODE-READY STORIES ──────────────────────────────────────────────────────────

app.post("/features/:id/code-stories", async (req, res) => {
  try {
    const feature = await featuresDb.getById(req.params.id);
    if (!feature) return res.status(404).json({ error: "Feature not found" });

    const project = await projectsDb.getById(feature.project_id);
    const [featureOutputs, constraints] = await Promise.all([
      featureOutputsDb.getAll(feature.id),
      constraintsDb.getAllForProject(feature.project_id),
    ]);

    // Pull PRD output as the primary source
    const prdOutput = featureOutputs.find(o => o.stage_id === "prd");
    if (!prdOutput) return res.status(400).json({ error: "Run the PRD stage first — stories are generated from the PRD." });

    const constraintBlock = formatConstraints(constraints);

    const prompt = `You are a senior engineer breaking down a feature PRD into atomic, code-ready user stories.

PROJECT: ${project.name}
${project.description ? "BRIEF: " + project.description : ""}

FEATURE: ${feature.name}
${feature.description ? feature.description : ""}

${constraintBlock}

PRD:
${prdOutput.content}

Break this feature into exactly 3 atomic user stories. Each story must be independently implementable by an engineer.

For each story return a JSON object with these exact keys:
- title: short story title (e.g. "User can submit parcel details form")
- persona: who the user is (1 sentence)
- job: the JTBD statement — "When [situation], I want to [action], so I can [outcome]"
- dataModel: specific DB schema changes, state shape, or data structure needed
- apiHandshake: { endpoint, method, requestExample, responseExample } — real JSON examples, not placeholders
- acceptanceCriteria: array of exactly 4 Pass/Fail test statements starting with "PASS if..." or "FAIL if..."
- edgeCases: array of exactly 3 edge cases — what happens when network fails, input is empty, or data is invalid

Return ONLY a JSON array of 3 story objects. No preamble, no markdown fences.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: AGENT_RULES,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text.trim().replace(/```json|```/g, "").trim();
    const stories = JSON.parse(text);

    // Save to feature_outputs as stage_id "code_stories"
    const stored = JSON.stringify(stories);
    await featureOutputsDb.save(randomUUID(), feature.id, "code_stories", stored);

    res.json({ stories });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.post("/features/:id/code-stories/save", async (req, res) => {
  try {
    const { stories } = req.body;
    if (!stories) return res.status(400).json({ error: "Stories required" });
    const stored = JSON.stringify(stories);
    await featureOutputsDb.save(randomUUID(), req.params.id, "code_stories", stored);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WRITING ENHANCER (Gemini) ─────────────────────────────────────────────────

app.post("/enhance-gemini", async (req, res) => {
  try {
    const { prompt, maxTokens = 3000 } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt required" });

    if (!geminiClient) {
      return res.status(503).json({ error: "GEMINI_API_KEY not configured on server." });
    }

    const model  = geminiClient.getGenerativeModel(
      { model: "gemini-2.0-flash" },
      { apiVersion: "v1beta" }
    );

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });

    res.json({ result: result.response.text() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── WRITING ENHANCER ──────────────────────────────────────────────────────────

app.post("/enhance", async (req, res) => {
  const { prompt, maxTokens = 3000 } = req.body;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ result: response.content[0].text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CHAT ──────────────────────────────────────────────────────────────────────

app.get("/projects/:id/chat", async (req, res) => {
  try { res.json(await chatDb.getAll(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/projects/:id/chat", async (req, res) => {
  try { await chatDb.clear(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/chat", async (req, res) => {
  const { messages, projectId, activeFeatureId } = req.body;

  if (projectId && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === "user") await chatDb.add(projectId, "user", last.content);
  }

  let systemContext = "";
  try {
    const [project, projectOutputs, constraints] = await Promise.all([
      projectsDb.getById(projectId),
      projectOutputsDb.getAll(projectId),
      constraintsDb.getAllForProject(projectId),
    ]);

    if (project) {
      systemContext += "PROJECT: " + project.name;
      if (project.description) systemContext += "\n" + project.description;
    }
    if (constraints.length > 0) systemContext += "\n\n" + formatConstraints(constraints);

    const CHAT_CAP = 6000;
    if (projectOutputs.length > 0) {
      systemContext += "\n\nPROJECT STRATEGY:";
      projectOutputs.forEach(o => {
        const text = o.content.length > CHAT_CAP ? o.content.slice(0, CHAT_CAP) + "\n...[truncated]" : o.content;
        systemContext += "\n\n" + (getStage(o.stage_id)?.label || o.stage_id).toUpperCase() + ":\n" + text;
      });
    }
    if (activeFeatureId) {
      const [feature, featureOutputs] = await Promise.all([
        featuresDb.getById(activeFeatureId),
        featureOutputsDb.getAll(activeFeatureId),
      ]);
      if (feature) {
        systemContext += "\n\nACTIVE FEATURE: " + feature.name;
        if (feature.description) systemContext += "\n" + feature.description;
        featureOutputs.forEach(o => {
          const text = o.content.length > CHAT_CAP ? o.content.slice(0, CHAT_CAP) + "\n...[truncated]" : o.content;
          systemContext += "\n\n" + (getStage(o.stage_id)?.label || o.stage_id).toUpperCase() + ":\n" + text;
        });
      }
    }
  } catch (e) { console.error("Context error:", e.message); }

  const system = `${AGENT_RULES}

## Discovery Interview Mode
If the user is describing a new product idea or feature they haven't defined yet, do NOT immediately generate a brief or spec. Instead, ask 3-5 pointed, non-obvious questions that clarify the "Why," the "User Pain," and the "Technical Constraints." Only proceed to output after the user has answered.

Trigger phrases: "I want to build", "I have an idea", "what do you think about", "can we create", "new feature idea", "help me think through"

## Project Context
${systemContext}`;

  // Detect "Research this" trigger — run PSE search and prepend results to context
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  const researchMatch = lastUserMsg.match(/research\s+(?:this[:\s]+)?(.+)/i);

  if (researchMatch) {
    try {
      const searchQuery = researchMatch[1]?.trim() || activeProject?.name || lastUserMsg;
      const pseResults  = await googlePSESearch(searchQuery, { num: 5, dateRestrict: "m12" });
      if (pseResults.length) {
        const resultsBlock = pseResults.map((r, i) =>
          `[${i+1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
        ).join("\n\n");
        // Inject search results into the final user message
        messages[messages.length - 1] = {
          role: "user",
          content: `${lastUserMsg}\n\nGOOGLE SEARCH RESULTS:\n${resultsBlock}\n\nSummarise these results and identify the top 5 competitors or relevant data points. Cite all sources.`,
        };
      }
    } catch (e) { console.error("PSE chat search error:", e.message); }
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system,
      messages,
    });
    const reply = response.content[0].text;
    if (projectId) await chatDb.add(projectId, "assistant", reply);
    res.json({ reply });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── START ─────────────────────────────────────────────────────────────────────

initDb().then(() => {
  app.listen(3001, () => {
    console.log("PM Agent server running on http://localhost:3001");
    console.log("API Key:", process.env.ANTHROPIC_API_KEY ? "loaded" : "MISSING");
  });
}).catch(err => {
  console.error("Failed to init database:", err.message);
  process.exit(1);
});