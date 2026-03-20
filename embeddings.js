// ── embeddings.js ─────────────────────────────────────────────────────────────
// RAG pipeline: chunk → embed (Voyage AI) → upsert to pgvector
// Used after every stage save, and queried in buildContextBlock + chat.

import { vectorDb } from "./db.js";

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_MODEL   = "voyage-3-lite"; // 512-dim, generous free tier
const EMBED_DIM      = 512;

// ── Core embedding call ───────────────────────────────────────────────────────

export async function embedTexts(texts) {
  if (!VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not set");
  if (!texts.length)   return [];

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data.map(d => d.embedding); // array of float[]
}

// ── Chunking ──────────────────────────────────────────────────────────────────
// Splits long text into overlapping chunks for better retrieval.

function chunkText(text, maxChars = 1200, overlap = 200) {
  if (!text || text.length <= maxChars) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start += maxChars - overlap;
  }
  return chunks;
}

// ── Embed and store a stage output ───────────────────────────────────────────
// Called after every projectOutputsDb.save() or featureOutputsDb.save()

export async function embedStageOutput({ projectId, featureId = null, stageId, content, projectName, featureName = null }) {
  if (!VOYAGE_API_KEY) {
    console.warn("VOYAGE_API_KEY not set — skipping embedding for", stageId);
    return;
  }

  try {
    const text = typeof content === "string" ? content : JSON.stringify(content);
    const chunks = chunkText(text);

    const embeddings = await embedTexts(chunks);

    for (let i = 0; i < chunks.length; i++) {
      await vectorDb.upsert({
        projectId,
        featureId,
        stageId,
        chunkIndex: i,
        content:    chunks[i],
        embedding:  embeddings[i],
        metadata: {
          projectName,
          featureName,
          stageId,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      });
    }

    console.log(`Embedded ${chunks.length} chunk(s) for stage: ${stageId}`);
  } catch (e) {
    // Non-fatal — log and continue. Never block a stage save due to embedding failure.
    console.error("Embedding failed for", stageId, "—", e.message);
  }
}

// ── Embed a project brief ─────────────────────────────────────────────────────

export async function embedProjectBrief({ projectId, projectName, description }) {
  if (!description?.trim()) return;
  await embedStageOutput({
    projectId,
    stageId:     "brief",
    content:     `PROJECT: ${projectName}\n\n${description}`,
    projectName,
  });
}

// ── Embed a feature definition ────────────────────────────────────────────────

export async function embedFeature({ projectId, featureId, projectName, featureName, description }) {
  if (!featureName) return;
  await embedStageOutput({
    projectId,
    featureId,
    stageId:     "feature_definition",
    content:     `FEATURE: ${featureName}\n\n${description || "No description provided."}`,
    projectName,
    featureName,
  });
}

// ── Embed a UI screenshot description ────────────────────────────────────────
// Screenshots are passed as base64 — we embed a text description instead.

export async function embedUIDescription({ projectId, featureId, projectName, featureName, description }) {
  if (!description?.trim()) return;
  await embedStageOutput({
    projectId,
    featureId,
    stageId:     "ui_screenshot",
    content:     `UI SCREENSHOT DESCRIPTION for ${featureName || projectName}:\n\n${description}`,
    projectName,
    featureName,
  });
}

// ── Retrieve relevant memory ──────────────────────────────────────────────────
// Returns top-K chunks most relevant to the current query.
// Used in buildContextBlock and chat to ground generation.

export async function retrieveMemory({ query, projectId, topK = 4, excludeStages = [] }) {
  if (!VOYAGE_API_KEY) return "";

  try {
    const [queryEmbedding] = await embedTexts([query]);
    const results = await vectorDb.search({
      embedding:    queryEmbedding,
      projectId,
      topK,
      excludeStages,
    });

    if (!results.length) return "";

    const formatted = results.map(r => {
      const label = r.metadata?.featureName
        ? `[${r.metadata.stageId.toUpperCase()} — ${r.metadata.featureName}]`
        : `[${r.metadata?.stageId?.toUpperCase() || "MEMORY"}]`;
      return `${label}\n${r.content}`;
    }).join("\n\n---\n\n");

    return `\n── RETRIEVED MEMORY (RAG) ──\n${formatted}`;
  } catch (e) {
    console.error("Memory retrieval failed:", e.message);
    return "";
  }
}

export { EMBED_DIM };
