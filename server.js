import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { runPipeline } from "./agents/orchestrator.js";
import { runCompetitorAnalysis } from "./agents/competitor.js";
import { runArchitecture } from "./agents/architecture.js";
import { runFlow } from "./agents/flow.js";
import { initDb, projectsDb, pipelineDb, chatDb } from "./db.js";

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["POST", "GET", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────

app.get("/projects", async (req, res) => {
  try { res.json(await projectsDb.getAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/projects", async (req, res) => {
  try {
    const { name, idea = "" } = req.body;
    const id = randomUUID();
    await projectsDb.create(id, name, idea);
    res.json(await projectsDb.getById(id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/projects/:id", async (req, res) => {
  try {
    const { name, idea } = req.body;
    await projectsDb.update(req.params.id, name, idea);
    res.json(await projectsDb.getById(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    await projectsDb.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/projects/:id/pipeline", async (req, res) => {
  try {
    const outputs = await pipelineDb.getAll(req.params.id);
    const map = {};
    outputs.forEach(o => {
      try { map[o.stage] = JSON.parse(o.content); }
      catch { map[o.stage] = o.content; }
    });
    res.json(map);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/projects/:id/pipeline/:stage", async (req, res) => {
  try {
    const { content } = req.body;
    const stored = typeof content === "string" ? content : JSON.stringify(content);
    await pipelineDb.save(randomUUID(), req.params.id, req.params.stage, stored);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/projects/:id/chat", async (req, res) => {
  try { res.json(await chatDb.getAll(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/projects/:id/chat", async (req, res) => {
  try {
    await chatDb.clear(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE AGENTS
// ─────────────────────────────────────────────────────────────────────────────

app.post("/run", async (req, res) => {
  try { res.json(await runPipeline(req.body.idea)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/competitor", async (req, res) => {
  try { res.json({ result: await runCompetitorAnalysis(req.body.idea) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/architecture", async (req, res) => {
  try { res.json({ result: await runArchitecture(req.body.idea) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/flow", async (req, res) => {
  try { res.json({ result: await runFlow(req.body.idea) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// WRITING ENHANCER
// ─────────────────────────────────────────────────────────────────────────────

app.post("/enhance", async (req, res) => {
  const { prompt, maxTokens = 3000 } = req.body;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ result: response.content[0].text });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PM CHAT
// ─────────────────────────────────────────────────────────────────────────────

app.post("/chat", async (req, res) => {
  const { messages, projectId, pipelineContext } = req.body;

  // Persist user message
  if (projectId && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === "user") await chatDb.add(projectId, "user", last.content);
  }

  // Build context block from pipeline outputs
  let contextBlock = "";
  if (pipelineContext && Object.keys(pipelineContext).length > 0) {
    contextBlock = "\n\n━━━ CURRENT PROJECT CONTEXT ━━━";
    if (pipelineContext.idea)         contextBlock += `\n\nFEATURE IDEA:\n${pipelineContext.idea}`;
    if (pipelineContext.Competitor)   contextBlock += `\n\nCOMPETITOR ANALYSIS:\n${pipelineContext.Competitor}`;
    if (pipelineContext.PRD)          contextBlock += `\n\nPRD:\n${pipelineContext.PRD}`;
    if (pipelineContext.Architecture) contextBlock += `\n\nTECHNICAL ARCHITECTURE:\n${pipelineContext.Architecture}`;
    if (pipelineContext.Flow)         contextBlock += `\n\nHIGH LEVEL FLOW:\n${pipelineContext.Flow}`;
    if (pipelineContext.Review)       contextBlock += `\n\nSPEC REVIEW:\n${pipelineContext.Review}`;
    if (pipelineContext.Tickets)      contextBlock += `\n\nTICKETS:\n${JSON.stringify(pipelineContext.Tickets, null, 2)}`;
    if (pipelineContext.Roadmap)      contextBlock += `\n\nROADMAP:\n${pipelineContext.Roadmap}`;
    contextBlock += "\n\n━━━ END CONTEXT ━━━\n";
  }

  const systemPrompt = `You are a senior PM Assistant with 15 years of product management experience. You work embedded in a product team helping the PM think sharper, communicate better, and ship faster.

Deep expertise in: PRDs, user stories, acceptance criteria, stakeholder comms, RICE/MoSCoW prioritisation, sprint planning, roadmapping, competitor analysis, discovery, and retros.

Personality: Direct and opinionated. Ask sharp clarifying questions. Push back when something isn't thought through. Pragmatic — perfect is the enemy of shipped. Speak like a senior colleague.
${contextBlock}
When you have project context: reference it directly. Quote from the PRD. Point to specific tickets. Flag gaps. Give answers that feel like they're from someone who has read and understands this exact project.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    });
    const reply = response.content[0].text;
    if (projectId) await chatDb.add(projectId, "assistant", reply);
    res.json({ reply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

initDb().then(() => {
  app.listen(3001, () => {
    console.log("✅ PM Agent server running on http://localhost:3001");
    console.log("🔑 API Key:", process.env.ANTHROPIC_API_KEY ? "loaded ✓" : "MISSING ✗");
    console.log("🐘 Postgres:", process.env.DATABASE_URL || "not set");
  });
}).catch(err => {
  console.error("❌ Failed to init database:", err.message);
  process.exit(1);
});