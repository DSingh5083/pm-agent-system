// ── db.js ─────────────────────────────────────────────────────────────────────
// DB helpers matching exact production schema.
// Tables: projects, constraints, project_outputs, features, feature_outputs,
//         chat_messages, docs, pipeline_outputs (legacy, unused), embeddings (new)

import pg from "pg";
const { Pool } = pg;

import { parse } from "pg-connection-string";

const dbConfig = process.env.DATABASE_URL
  ? { ...parse(process.env.DATABASE_URL), ssl: { rejectUnauthorized: false }, max: 5 }
  : { connectionString: "postgresql://localhost:5432/pm_agent", max: 5 };

export const pool = new Pool(dbConfig);

// ── initDb ────────────────────────────────────────────────────────────────────
// Only creates NEW tables (embeddings). Never alters existing ones.

export async function initDb() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

  // Only create embeddings — all other tables already exist in production
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

  // Create vector index — ignore error if not enough data yet
  await pool.query(`
    CREATE INDEX IF NOT EXISTS embeddings_vector_idx
    ON embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50)
  `).catch(() => {});

  console.log("DB initialised (pgvector ready)");
}

// ── projectsDb ────────────────────────────────────────────────────────────────
// Schema: id, name, description, constraints, created_at, updated_at

export const projectsDb = {
  getAll: () => pool.query(`
    SELECT
      p.id, p.name, p.description, p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM features   WHERE project_id = p.id) AS feature_count,
      (SELECT COUNT(*) FROM constraints WHERE project_id = p.id) AS constraint_count
    FROM projects p
    ORDER BY p.updated_at DESC
  `).then(r => r.rows),

  getById: (id) => pool.query(
    `SELECT * FROM projects WHERE id = $1`, [id]
  ).then(r => r.rows[0] || null),

  create: (id, name, description) => pool.query(
    `INSERT INTO projects (id, name, description) VALUES ($1, $2, $3)`,
    [id, name, description || ""]
  ),

  update: (id, name, description) => pool.query(
    `UPDATE projects SET name=$1, description=$2, updated_at=NOW() WHERE id=$3`,
    [name, description || "", id]
  ),

  delete: (id) => pool.query(`DELETE FROM projects WHERE id = $1`, [id]),
};

// ── constraintsDb ─────────────────────────────────────────────────────────────
// Schema: id, project_id, type, title, description, severity, position, created_at

export const constraintsDb = {
  getAllForProject: (projectId) => pool.query(
    `SELECT * FROM constraints WHERE project_id = $1 ORDER BY position ASC, created_at ASC`,
    [projectId]
  ).then(r => r.rows),

  create: (id, projectId, type, title, description, severity) => pool.query(
    `INSERT INTO constraints (id, project_id, type, title, description, severity)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, projectId, type || "Compliance", title, description || "", severity || "Must"]
  ).then(r => r.rows[0]),

  update: (id, type, title, description, severity) => pool.query(
    `UPDATE constraints SET type=$1, title=$2, description=$3, severity=$4 WHERE id=$5`,
    [type || "Compliance", title, description || "", severity || "Must", id]
  ),

  delete: (id) => pool.query(`DELETE FROM constraints WHERE id = $1`, [id]),
};

// ── projectOutputsDb ──────────────────────────────────────────────────────────
// Schema: id, project_id, stage_id, content, created_at

export const projectOutputsDb = {
  getAll: (projectId) => pool.query(
    `SELECT * FROM project_outputs WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  ).then(r => r.rows),

  save: (id, projectId, stageId, content) => pool.query(
    `INSERT INTO project_outputs (id, project_id, stage_id, content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, stage_id) DO UPDATE SET content=$4, id=$1`,
    [id, projectId, stageId, content]
  ),
};

// ── featuresDb ────────────────────────────────────────────────────────────────
// Schema: id, project_id, name, description, position, created_at, updated_at

export const featuresDb = {
  getAllForProject: (projectId) => pool.query(`
    SELECT f.*,
      (SELECT COUNT(*) FROM feature_outputs WHERE feature_id = f.id) AS output_count
    FROM features f
    WHERE f.project_id = $1
    ORDER BY f.position ASC, f.created_at ASC
  `, [projectId]).then(r => r.rows),

  getById: (id) => pool.query(
    `SELECT * FROM features WHERE id = $1`, [id]
  ).then(r => r.rows[0] || null),

  create: (id, projectId, name, description) => pool.query(
    `INSERT INTO features (id, project_id, name, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, projectId, name, description || ""]
  ).then(r => r.rows[0]),

  update: (id, name, description) => pool.query(
    `UPDATE features SET name=$1, description=$2, updated_at=NOW()
     WHERE id=$3 RETURNING *`,
    [name, description || "", id]
  ).then(r => r.rows[0]),

  delete: (id) => pool.query(`DELETE FROM features WHERE id = $1`, [id]),
};

// ── featureOutputsDb ──────────────────────────────────────────────────────────
// Schema: id, feature_id, stage_id, content, created_at

export const featureOutputsDb = {
  getAll: (featureId) => pool.query(
    `SELECT * FROM feature_outputs WHERE feature_id = $1 ORDER BY created_at ASC`,
    [featureId]
  ).then(r => r.rows),

  save: (id, featureId, stageId, content) => pool.query(
    `INSERT INTO feature_outputs (id, feature_id, stage_id, content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (feature_id, stage_id) DO UPDATE SET content=$4, id=$1`,
    [id, featureId, stageId, content]
  ),
};

// ── chatDb ────────────────────────────────────────────────────────────────────
// Schema: id (serial), project_id, role, content, created_at

export const chatDb = {
  getAll: (projectId) => pool.query(
    `SELECT role, content FROM chat_messages
     WHERE project_id = $1 ORDER BY created_at ASC`,
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
// Schema: id, project_id, title, prompt, content, created_at, updated_at

export const docsDb = {
  getAllForProject: (projectId) => pool.query(
    `SELECT id, project_id, title, prompt, created_at, updated_at,
      LEFT(content, 200) AS preview
     FROM docs WHERE project_id = $1 ORDER BY updated_at DESC`,
    [projectId]
  ).then(r => r.rows),

  getById: (id) => pool.query(
    `SELECT * FROM docs WHERE id = $1`, [id]
  ).then(r => r.rows[0] || null),

  create: (id, projectId, title, prompt, content) => pool.query(
    `INSERT INTO docs (id, project_id, title, prompt, content)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, projectId, title, prompt, content]
  ).then(r => r.rows[0]),

  update: (id, title, content) => pool.query(
    `UPDATE docs SET title=$1, content=$2, updated_at=NOW() WHERE id=$3`,
    [title, content, id]
  ),

  delete: (id) => pool.query(`DELETE FROM docs WHERE id = $1`, [id]),
};

// ── vectorDb ──────────────────────────────────────────────────────────────────
// Schema: id, project_id, feature_id, stage_id, chunk_index, content, metadata, embedding, created_at

export const vectorDb = {
  upsert: async ({ projectId, featureId = null, stageId, chunkIndex = 0, content, embedding, metadata = {} }) => {
    const embeddingStr = `[${embedding.join(",")}]`;
    await pool.query(
      `INSERT INTO embeddings
         (project_id, feature_id, stage_id, chunk_index, content, metadata, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (project_id, feature_id, stage_id, chunk_index)
       DO UPDATE SET content=$5, metadata=$6, embedding=$7, created_at=NOW()`,
      [projectId, featureId, stageId, chunkIndex, content, JSON.stringify(metadata), embeddingStr]
    );
  },

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
      query += ` AND stage_id != ALL($3) ORDER BY embedding <=> $1::vector LIMIT $4`;
      params.push(excludeStages, topK);
    } else {
      query += ` ORDER BY embedding <=> $1::vector LIMIT $3`;
      params.push(topK);
    }

    return pool.query(query, params).then(r => r.rows);
  },

  deleteForProject: (projectId) => pool.query(
    `DELETE FROM embeddings WHERE project_id = $1`, [projectId]
  ),

  deleteForStage: (projectId, stageId, featureId = null) => pool.query(
    `DELETE FROM embeddings
     WHERE project_id=$1 AND stage_id=$2
     AND (feature_id=$3 OR ($3 IS NULL AND feature_id IS NULL))`,
    [projectId, stageId, featureId]
  ),
};
