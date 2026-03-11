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
const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain + explicit allowlist
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

// Serialise a context value — arrays/objects as JSON, strings as-is
function serialise(val) {
  if (typeof val === "string") return val;
  return JSON.stringify(val, null, 2);
}

// Build a full human-readable context block from ctx object
// No truncation — pass everything. Claude's context window handles it.
function buildContextBlock(ctx) {
  const parts = [];
  if (ctx.projectName)        parts.push("PROJECT: " + ctx.projectName);
  if (ctx.projectDescription) parts.push("DESCRIPTION: " + ctx.projectDescription);
  if (ctx.featureName)        parts.push("FEATURE: " + ctx.featureName);
  if (ctx.featureDescription) parts.push("FEATURE DESCRIPTION: " + ctx.featureDescription);
  if (ctx.constraints)        parts.push(ctx.constraints);

  // Prior stage outputs — full, no truncation
  const stageKeys = Object.keys(ctx).filter(k =>
    !["projectName","projectDescription","featureName","featureDescription","constraints","briefing","interviewAnswers"].includes(k)
  );
  if (stageKeys.length > 0) {
    parts.push("\n── PRIOR WORK ──");
    stageKeys.forEach(k => {
      const stage = getStage(k);
      const label = stage ? stage.label.toUpperCase() : k.toUpperCase();
      parts.push(`\n${label}:\n${serialise(ctx[k])}`);
    });
  }

  if (ctx.briefing)         parts.push("\n── CONTEXT BRIEFING ──\n" + ctx.briefing);
  if (ctx.interviewAnswers) parts.push("\n── CLARIFYING ANSWERS FROM USER ──\n" + ctx.interviewAnswers);

  return parts.join("\n");
}

// Build context object for a project stage — NO truncation
async function buildProjectContext(projectId, project) {
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

// Build context object for a feature stage — NO truncation
async function buildFeatureContext(featureId, feature, project) {
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

// ── Interview: generate 3-5 clarifying questions before a stage runs ─────────
// Returns questions as a JSON array of strings.
async function generateInterviewQuestions(stageId, ctx) {
  const stage = getStage(stageId);
  const contextBlock = buildContextBlock(ctx);

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
    // Fallback: extract anything that looks like a question
    const lines = text.split("\n").filter(l => l.includes("?")).map(l => l.replace(/^[-*\d.]\s*/, "").trim());
    return lines.length > 0 ? lines : ["What specific problem does this solve for the user?", "What does success look like in 3 months?"];
  }
}

// ── Distillation: synthesise prior outputs into a structured briefing ─────────
async function distillContext(stageId, ctx) {
  const stage = getStage(stageId);
  const stageKeys = Object.keys(ctx).filter(k =>
    !["projectName","projectDescription","featureName","featureDescription","constraints","briefing","interviewAnswers"].includes(k)
  );

  // No prior work to distil
  if (stageKeys.length === 0) return null;

  const priorWork = stageKeys.map(k => {
    const label = getStage(k)?.label || k;
    return `${label.toUpperCase()}:\n${serialise(ctx[k])}`;
  }).join("\n\n");

  const prompt = `You are preparing a structured briefing for a ${stage.label} generation.

PRODUCT: ${ctx.projectName}
${ctx.featureName ? "FEATURE: " + ctx.featureName : ""}

PRIOR WORK COMPLETED:
${priorWork}

Create a tight briefing that extracts the most important context for writing a ${stage.label}. Include:

## Key Decisions Already Made
What has already been decided that the ${stage.label} must respect?

## Established Facts
Specific facts, numbers, names, and constraints already known.

## What's Already Ruled Out
Things explicitly out of scope or already rejected.

## Critical Gaps
What's still unknown that will most affect the ${stage.label}?

Be specific. Use actual names, numbers, and terms from the prior work. No generic statements.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].text;
}

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

// Get interview questions for a project stage
app.post("/projects/:id/interview/:stageId", async (req, res) => {
  try {
    const project = await projectsDb.getById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const ctx       = await buildProjectContext(req.params.id, project);
    const questions = await generateInterviewQuestions(req.params.stageId, ctx);
    res.json({ questions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Run a project stage (with optional interview answers)
app.post("/projects/:id/run/:stageId", async (req, res) => {
  try {
    const project = await projectsDb.getById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const ctx = await buildProjectContext(req.params.id, project);

    // Inject interview answers if provided
    if (req.body.interviewAnswers) ctx.interviewAnswers = req.body.interviewAnswers;

    // Distil prior context into a briefing
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

// Get interview questions for a feature stage
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

// Run a feature stage (with optional interview answers)
app.post("/features/:id/run/:stageId", async (req, res) => {
  try {
    const feature = await featuresDb.getById(req.params.id);
    if (!feature) return res.status(404).json({ error: "Feature not found" });
    const project = await projectsDb.getById(feature.project_id);

    const ctx = await buildFeatureContext(req.params.id, feature, project);

    // Inject interview answers if provided
    if (req.body.interviewAnswers) ctx.interviewAnswers = req.body.interviewAnswers;

    // Distil prior context into a briefing
    const briefing = await distillContext(req.params.stageId, ctx);
    if (briefing) ctx.briefing = briefing;

    const result = await runStage(req.params.stageId, ctx);
    const stored = typeof result === "string" ? result : JSON.stringify(result);
    await featureOutputsDb.save(randomUUID(), req.params.id, req.params.stageId, stored);
    res.json({ result });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    if (projectOutputs.length > 0) {
      systemContext += "\n\nPROJECT STRATEGY:";
      projectOutputs.forEach(o => {
        systemContext += "\n\n" + (getStage(o.stage_id)?.label || o.stage_id).toUpperCase() + ":\n" + o.content;
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
          systemContext += "\n\n" + (getStage(o.stage_id)?.label || o.stage_id).toUpperCase() + ":\n" + o.content;
        });
      }
    }
  } catch (e) { console.error("Context error:", e.message); }

  const system = `You are a senior PM Assistant, 15 years experience. Direct, opinionated, pragmatic. Push back when needed. Reference specific details from the context — never give generic answers.

${systemContext}`;

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
