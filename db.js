// ── db.js ─────────────────────────────────────────────────────────────────────
// Existing DB helpers + pgvector vectorDb for RAG memory.
// Add the vectorDb section to your existing db.js — do not replace the whole file,
// just append the pgvector init to initDb() and add the vectorDb export.

import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 5, // keep under Render free tier connection limit
});

// ── initDb ────────────────────────────────────────────────────────────────────
// Run once on startup. Creates all tables including pgvector embeddings table.

export async function initDb() {
  // Enable pgvector extension (requires Render PostgreSQL 15+)
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

  // ── Existing tables ───────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS constraints (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      severity    TEXT DEFAULT 'medium',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_outputs (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage_id   TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, stage_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS features (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feature_outputs (
      id         TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      stage_id   TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(feature_id, stage_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         SERIAL PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS docs (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      prompt     TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── pgvector embeddings table ─────────────────────────────────────────────
  // Stores embedded chunks for RAG memory retrieval.
  // 512 dims matches voyage-3-lite. Change if switching embedding model.

  await pool.query(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id          SERIAL PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      feature_id  TEXT REFERENCES features(id) ON DELETE CASCADE,
      stage_id    TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      content     TEXT NOT NULL,
      metadata    JSONB DEFAULT '{}',
      embedding   vector(512),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, feature_id, stage_id, chunk_index)
    )
  `);

  // IVFFlat index for fast approximate nearest-neighbour search.
  // Only create if table has data — harmless to run on empty table.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS embeddings_vector_idx
    ON embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50)
  `);

  console.log("DB initialised (pgvector ready)");
}

// ── projectsDb ────────────────────────────────────────────────────────────────

export const projectsDb = {
  getAll:   () => pool.query(`SELECT * FROM projects ORDER BY created_at DESC`).then(r => r.rows),
  getById:  (id) => pool.query(`SELECT * FROM projects WHERE id = $1`, [id]).then(r => r.rows[0] || null),
  create:   (id, name, description) => pool.query(
    `INSERT INTO projects (id, name, description) VALUES ($1, $2, $3)`,
    [id, name, description]
  ),
  update:   (id, name, description) => pool.query(
    `UPDATE projects SET name = $1, description = $2 WHERE id = $3`,
    [name, description, id]
  ),
  delete:   (id) => pool.query(`DELETE FROM projects WHERE id = $1`, [id]),
};

// ── constraintsDb ─────────────────────────────────────────────────────────────

export const constraintsDb = {
  getAllForProject: (projectId) => pool.query(
    `SELECT * FROM constraints WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  ).then(r => r.rows),
  create: (id, projectId, type, title, description, severity) => pool.query(
    `INSERT INTO constraints (id, project_id, type, title, description, severity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, projectId, type, title, description, severity]
  ).then(r => r.rows[0]),
  update: (id, type, title, description, severity) => pool.query(
    `UPDATE constraints SET type=$1, title=$2, description=$3, severity=$4 WHERE id=$5`,
    [type, title, description, severity, id]
  ),
  delete: (id) => pool.query(`DELETE FROM constraints WHERE id = $1`, [id]),
};

// ── projectOutputsDb ──────────────────────────────────────────────────────────

export const projectOutputsDb = {
  getAll: (projectId) => pool.query(
    `SELECT * FROM project_outputs WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  ).then(r => r.rows),
  save: (id, projectId, stageId, content) => pool.query(
    `INSERT INTO project_outputs (id, project_id, stage_id, content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, stage_id) DO UPDATE SET content = $4, id = $1`,
    [id, projectId, stageId, content]
  ),
};

// ── featuresDb ────────────────────────────────────────────────────────────────

export const featuresDb = {
  getAllForProject: (projectId) => pool.query(
    `SELECT * FROM features WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  ).then(r => r.rows),
  getById: (id) => pool.query(
    `SELECT * FROM features WHERE id = $1`, [id]
  ).then(r => r.rows[0] || null),
  create: (id, projectId, name, description) => pool.query(
    `INSERT INTO features (id, project_id, name, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, projectId, name, description]
  ).then(r => r.rows[0]),
  update: (id, name, description) => pool.query(
    `UPDATE features SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
    [name, description, id]
  ).then(r => r.rows[0]),
  delete: (id) => pool.query(`DELETE FROM features WHERE id = $1`, [id]),
};

// ── featureOutputsDb ──────────────────────────────────────────────────────────

export const featureOutputsDb = {
  getAll: (featureId) => pool.query(
    `SELECT * FROM feature_outputs WHERE feature_id = $1 ORDER BY created_at ASC`,
    [featureId]
  ).then(r => r.rows),
  save: (id, featureId, stageId, content) => pool.query(
    `INSERT INTO feature_outputs (id, feature_id, stage_id, content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (feature_id, stage_id) DO UPDATE SET content = $4, id = $1`,
    [id, featureId, stageId, content]
  ),
};

// ── chatDb ────────────────────────────────────────────────────────────────────

export const chatDb = {
  getAll: (projectId) => pool.query(
    `SELECT role, content FROM chat_messages WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  ).then(r => r.rows),
  add: (projectId, role, content) => pool.query(
    `INSERT INTO chat_messages (project_id, role, content) VALUES ($1, $2, $3)`,
    [projectId, role, content]
  ),
  clear: (projectId) => pool.query(
    `DELETE FROM chat_messages WHERE project_id = $1`, [projectId]
  ),
};

// ── docsDb ────────────────────────────────────────────────────────────────────

export const docsDb = {
  getAllForProject: (projectId) => pool.query(
    `SELECT id, project_id, title, prompt, created_at, updated_at FROM docs WHERE project_id = $1 ORDER BY updated_at DESC`,
    [projectId]
  ).then(r => r.rows),
  getById: (id) => pool.query(
    `SELECT * FROM docs WHERE id = $1`, [id]
  ).then(r => r.rows[0] || null),
  create: (id, projectId, title, prompt, content) => pool.query(
    `INSERT INTO docs (id, project_id, title, prompt, content) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, projectId, title, prompt, content]
  ).then(r => r.rows[0]),
  update: (id, title, content) => pool.query(
    `UPDATE docs SET title = $1, content = $2, updated_at = NOW() WHERE id = $3`,
    [title, content, id]
  ),
  delete: (id) => pool.query(`DELETE FROM docs WHERE id = $1`, [id]),
};

// ── vectorDb ──────────────────────────────────────────────────────────────────
// pgvector helpers for RAG memory storage and retrieval.

export const vectorDb = {
  // Upsert a single embedding chunk
  upsert: async ({ projectId, featureId = null, stageId, chunkIndex = 0, content, embedding, metadata = {} }) => {
    const embeddingStr = `[${embedding.join(",")}]`;
    await pool.query(
      `INSERT INTO embeddings (project_id, feature_id, stage_id, chunk_index, content, metadata, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (project_id, feature_id, stage_id, chunk_index)
       DO UPDATE SET content = $5, metadata = $6, embedding = $7, created_at = NOW()`,
      [projectId, featureId, stageId, chunkIndex, content, JSON.stringify(metadata), embeddingStr]
    );
  },

  // Cosine similarity search — returns top-K chunks most similar to query embedding
  search: async ({ embedding, projectId, topK = 4, excludeStages = [] }) => {
    const embeddingStr = `[${embedding.join(",")}]`;

    let query = `
      SELECT content, metadata, stage_id,
             1 - (embedding <=> $1::vector) AS similarity
      FROM embeddings
      WHERE project_id = $2
    `;
    const params = [embeddingStr, projectId];

    if (excludeStages.length > 0) {
      query += ` AND stage_id != ALL($3)`;
      params.push(excludeStages);
      query += ` ORDER BY embedding <=> $1::vector LIMIT $4`;
      params.push(topK);
    } else {
      query += ` ORDER BY embedding <=> $1::vector LIMIT $3`;
      params.push(topK);
    }

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Delete all embeddings for a project (e.g. on project delete)
  deleteForProject: (projectId) => pool.query(
    `DELETE FROM embeddings WHERE project_id = $1`, [projectId]
  ),

  // Delete embeddings for a specific stage (e.g. when stage is re-run)
  deleteForStage: (projectId, stageId, featureId = null) => pool.query(
    `DELETE FROM embeddings WHERE project_id = $1 AND stage_id = $2 AND (feature_id = $3 OR ($3 IS NULL AND feature_id IS NULL))`,
    [projectId, stageId, featureId]
  ),
};