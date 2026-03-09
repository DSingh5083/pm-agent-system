// ─────────────────────────────────────────────────────────────────────────────
// lib/claude.js
//
// Central Claude API caller. All modules import from here.
// Change the model or add headers in ONE place — everywhere updates.
// ─────────────────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const API_URL      = "https://api.anthropic.com/v1/messages";

/**
 * Call Claude API from the backend.
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
export async function callClaude(prompt, maxTokens = 3000) {
  const res = await fetch("http://localhost:3001/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Backend error");
  }

  const data = await res.json();
  return data.result;
}

/**
 * Call your local Node backend (for server-side agents like PM Pipeline).
 * @param {string} endpoint  e.g. "/run"
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function callBackend(endpoint, body) {
  const res = await fetch(`http://localhost:3001${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Backend error — is node server.js running?");
  }

  return res.json();
}
