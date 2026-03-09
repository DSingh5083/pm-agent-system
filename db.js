// ─────────────────────────────────────────────────────────────────────────────
// db.js — PostgreSQL persistence layer
// npm install pg
// Add DATABASE_URL=postgresql://localhost:5432/pm_agent to .env
// Run initDb() once on server start to create tables
// ─────────────────────────────────────────────────────────────────────────────

import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

// ── Schema init — called once on server start ─────────────────────────────────

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      idea       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pipeline_outputs (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage      TEXT NOT NULL,
      content    TEXT NOT NULL,
      saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, stage)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         SERIAL PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ Postgres tables ready");
}

// ── Helper ────────────────────────────────────────────────────────────────────

const query = (text, params) => pool.query(text, params);

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsDb = {
  getAll: async () => {
    const { rows } = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM pipeline_outputs WHERE project_id = p.id)::int AS stage_count,
        (SELECT COUNT(*) FROM chat_messages    WHERE project_id = p.id)::int AS message_count
      FROM projects p
      ORDER BY p.updated_at DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const { rows } = await query("SELECT * FROM projects WHERE id = $1", [id]);
    return rows[0];
  },

  create: async (id, name, idea) => {
    await query("INSERT INTO projects (id, name, idea) VALUES ($1, $2, $3)", [id, name, idea]);
  },

  update: async (id, name, idea) => {
    await query(
      "UPDATE projects SET name=$1, idea=$2, updated_at=NOW() WHERE id=$3",
      [name, idea, id]
    );
  },

  touch: async (id) => {
    await query("UPDATE projects SET updated_at=NOW() WHERE id=$1", [id]);
  },

  delete: async (id) => {
    await query("DELETE FROM projects WHERE id=$1", [id]);
  },
};

// ── Pipeline outputs ──────────────────────────────────────────────────────────

export const pipelineDb = {
  getAll: async (projectId) => {
    const { rows } = await query(
      "SELECT * FROM pipeline_outputs WHERE project_id=$1",
      [projectId]
    );
    return rows;
  },

  save: async (id, projectId, stage, content) => {
    await query(`
      INSERT INTO pipeline_outputs (id, project_id, stage, content)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, stage)
      DO UPDATE SET content=EXCLUDED.content, saved_at=NOW()
    `, [id, projectId, stage, content]);
    await projectsDb.touch(projectId);
  },

  delete: async (projectId, stage) => {
    await query(
      "DELETE FROM pipeline_outputs WHERE project_id=$1 AND stage=$2",
      [projectId, stage]
    );
  },
};

// ── Chat messages ─────────────────────────────────────────────────────────────

export const chatDb = {
  getAll: async (projectId) => {
    const { rows } = await query(
      "SELECT * FROM chat_messages WHERE project_id=$1 ORDER BY created_at ASC",
      [projectId]
    );
    return rows;
  },

  add: async (projectId, role, content) => {
    await query(
      "INSERT INTO chat_messages (project_id, role, content) VALUES ($1, $2, $3)",
      [projectId, role, content]
    );
    await projectsDb.touch(projectId);
  },

  clear: async (projectId) => {
    await query("DELETE FROM chat_messages WHERE project_id=$1", [projectId]);
  },
};
