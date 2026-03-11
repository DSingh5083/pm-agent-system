// ─────────────────────────────────────────────────────────────────────────────
// lib/claude.js
//
// Central Claude API caller. All modules import from here.
// Change the model or add headers in ONE place — everywhere updates.
// ─────────────────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const API_URL      = "https://api.anthropic.com/v1/messages";

/**
 * Call Claude API directly from the browser.
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
export async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map((b) => b.text || "").join("\n");
}

/**
 * Call your local Node backend (for server-side agents like PM Pipeline).
 * @param {string} endpoint  e.g. "/run"
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function callBackend(endpoint, body) {
  const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${endpoint}`, {
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
