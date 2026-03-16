// ─────────────────────────────────────────────────────────────────────────────
// lib/claude.js
//
// Central Claude API caller. Routes ALL requests through the backend.
// Never calls Anthropic directly from the browser — avoids CORS errors.
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Call Claude via the backend /enhance endpoint.
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
export async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch(`${BACKEND}/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

/**
 * Call a specific backend endpoint directly.
 * @param {string} endpoint  e.g. "/run"
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function callBackend(endpoint, body) {
  const res = await fetch(`${BACKEND}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Backend error");
  }

  return res.json();
}
