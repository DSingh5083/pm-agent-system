import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE projects ADD COLUMN IF NOT EXISTS constraints TEXT NOT NULL DEFAULT '[]';

    CREATE TABLE IF NOT EXISTS project_constraints (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type        TEXT NOT NULL DEFAULT 'Compliance',
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      severity    TEXT NOT NULL DEFAULT 'Must',
      position    INT  NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_outputs (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage_id   TEXT NOT NULL,
      content    TEXT NOT NULL,
      saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, stage_id)
    );

    CREATE TABLE IF NOT EXISTS features (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      position    INT  NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feature_outputs (
      id         TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      stage_id   TEXT NOT NULL,
      content    TEXT NOT NULL,
      saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(feature_id, stage_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         SERIAL PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_docs (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      prompt     TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Postgres tables ready");
}

const q = (text, params) => pool.query(text, params);

export const projectsDb = {
  getAll: async () => {
    const { rows } = await q(`
      SELECT p.*,
        (SELECT COUNT(*) FROM features           WHERE project_id = p.id)::int AS feature_count,
        (SELECT COUNT(*) FROM project_outputs    WHERE project_id = p.id)::int AS output_count,
        (SELECT COUNT(*) FROM project_constraints WHERE project_id = p.id)::int AS constraint_count,
        (SELECT COUNT(*) FROM chat_messages      WHERE project_id = p.id)::int AS message_count
      FROM projects p ORDER BY p.updated_at DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const { rows } = await q("SELECT * FROM projects WHERE id=$1", [id]);
    return rows[0];
  },

  create: async (id, name, description) => {
    await q("INSERT INTO projects (id, name, description) VALUES ($1,$2,$3)", [id, name, description || ""]);
  },

  update: async (id, name, description) => {
    await q("UPDATE projects SET name=$1, description=$2, updated_at=NOW() WHERE id=$3", [name, description ?? "", id]);
  },

  touch: async (id) => {
    await q("UPDATE projects SET updated_at=NOW() WHERE id=$1", [id]);
  },

  delete: async (id) => {
    await q("DELETE FROM projects WHERE id=$1", [id]);
  },
};

export const constraintsDb = {
  getAllForProject: async (projectId) => {
    const { rows } = await q(
      "SELECT * FROM project_constraints WHERE project_id=$1 ORDER BY position ASC, created_at ASC",
      [projectId]
    );
    return rows;
  },

  create: async (id, projectId, type, title, description, severity) => {
    const { rows } = await q(`
      INSERT INTO project_constraints (id, project_id, type, title, description, severity, position)
      VALUES ($1, $2, $3, $4, $5, $6,
        (SELECT COALESCE(MAX(position), 0) + 1 FROM project_constraints WHERE project_id=$2))
      RETURNING *
    `, [id, projectId, type, title, description || "", severity || "Must"]);
    await projectsDb.touch(projectId);
    return rows[0];
  },

  update: async (id, type, title, description, severity) => {
    await q(
      "UPDATE project_constraints SET type=$1, title=$2, description=$3, severity=$4 WHERE id=$5",
      [type, title, description ?? "", severity, id]
    );
  },

  delete: async (id) => {
    await q("DELETE FROM project_constraints WHERE id=$1", [id]);
  },
};

export const projectOutputsDb = {
  getAll: async (projectId) => {
    const { rows } = await q("SELECT * FROM project_outputs WHERE project_id=$1", [projectId]);
    return rows;
  },

  save: async (id, projectId, stageId, content) => {
    await q(`
      INSERT INTO project_outputs (id, project_id, stage_id, content)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (project_id, stage_id)
      DO UPDATE SET content=EXCLUDED.content, saved_at=NOW()
    `, [id, projectId, stageId, content]);
    await projectsDb.touch(projectId);
  },

  delete: async (projectId, stageId) => {
    await q("DELETE FROM project_outputs WHERE project_id=$1 AND stage_id=$2", [projectId, stageId]);
  },
};

export const featuresDb = {
  getAllForProject: async (projectId) => {
    const { rows } = await q(`
      SELECT f.*,
        (SELECT COUNT(*) FROM feature_outputs WHERE feature_id = f.id)::int AS output_count
      FROM features f WHERE f.project_id=$1
      ORDER BY f.position ASC, f.created_at ASC
    `, [projectId]);
    return rows;
  },

  getById: async (id) => {
    const { rows } = await q("SELECT * FROM features WHERE id=$1", [id]);
    return rows[0];
  },

  create: async (id, projectId, name, description) => {
    const { rows } = await q(`
      INSERT INTO features (id, project_id, name, description, position)
      VALUES ($1,$2,$3,$4, (SELECT COALESCE(MAX(position),0)+1 FROM features WHERE project_id=$2))
      RETURNING *
    `, [id, projectId, name, description || ""]);
    await projectsDb.touch(projectId);
    return rows[0];
  },

  update: async (id, name, description) => {
    await q("UPDATE features SET name=$1, description=$2, updated_at=NOW() WHERE id=$3", [name, description ?? "", id]);
  },

  touch: async (id) => {
    const { rows } = await q("SELECT project_id FROM features WHERE id=$1", [id]);
    if (rows[0]) await projectsDb.touch(rows[0].project_id);
    await q("UPDATE features SET updated_at=NOW() WHERE id=$1", [id]);
  },

  delete: async (id) => {
    await q("DELETE FROM features WHERE id=$1", [id]);
  },
};

export const featureOutputsDb = {
  getAll: async (featureId) => {
    const { rows } = await q("SELECT * FROM feature_outputs WHERE feature_id=$1", [featureId]);
    return rows;
  },

  save: async (id, featureId, stageId, content) => {
    await q(`
      INSERT INTO feature_outputs (id, feature_id, stage_id, content)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (feature_id, stage_id)
      DO UPDATE SET content=EXCLUDED.content, saved_at=NOW()
    `, [id, featureId, stageId, content]);
    await featuresDb.touch(featureId);
  },

  delete: async (featureId, stageId) => {
    await q("DELETE FROM feature_outputs WHERE feature_id=$1 AND stage_id=$2", [featureId, stageId]);
  },
};

export const chatDb = {
  getAll: async (projectId) => {
    const { rows } = await q(
      "SELECT * FROM chat_messages WHERE project_id=$1 ORDER BY created_at ASC",
      [projectId]
    );
    return rows;
  },

  add: async (projectId, role, content) => {
    await q("INSERT INTO chat_messages (project_id,role,content) VALUES ($1,$2,$3)", [projectId, role, content]);
    await projectsDb.touch(projectId);
  },

  clear: async (projectId) => {
    await q("DELETE FROM chat_messages WHERE project_id=$1", [projectId]);
  },
};

export const docsDb = {
  getAllForProject: async (projectId) => {
    const { rows } = await q(
      "SELECT id, title, prompt, created_at, updated_at, LEFT(content, 200) AS preview FROM project_docs WHERE project_id=$1 ORDER BY updated_at DESC",
      [projectId]
    );
    return rows;
  },

  getById: async (id) => {
    const { rows } = await q("SELECT * FROM project_docs WHERE id=$1", [id]);
    return rows[0];
  },

  create: async (id, projectId, title, prompt, content) => {
    const { rows } = await q(
      "INSERT INTO project_docs (id, project_id, title, prompt, content) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [id, projectId, title, prompt, content]
    );
    await projectsDb.touch(projectId);
    return rows[0];
  },

  update: async (id, title, content) => {
    await q(
      "UPDATE project_docs SET title=$1, content=$2, updated_at=NOW() WHERE id=$3",
      [title, content, id]
    );
  },

  delete: async (id) => {
    await q("DELETE FROM project_docs WHERE id=$1", [id]);
  },
};
