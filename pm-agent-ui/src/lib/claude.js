// ─────────────────────────────────────────────────────────────────────────────
// lib/claude.js
//
// Central Claude API caller. Routes ALL requests through the backend.
// Never calls Anthropic directly from the browser — avoids CORS errors.
// Injects x-app-password header on every request if password is set.
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Auth helpers ──────────────────────────────────────────────────────────────

export function getStoredPassword() {
  return localStorage.getItem("app_password") || "";
}

export function setStoredPassword(pw) {
  localStorage.setItem("app_password", pw);
}

export function clearStoredPassword() {
  localStorage.removeItem("app_password");
}

const STORAGE_KEY = "pm_agent_auth";

function authHeaders() {
  const pw = sessionStorage.getItem(STORAGE_KEY) || "";
  return pw ? { "x-app-password": pw } : {};
}

// ── API callers ───────────────────────────────────────────────────────────────

/**
 * Call Claude via the backend /enhance endpoint.
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
export async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch(`${BACKEND}/enhance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ prompt, maxTokens }),
  });

  if (res.status === 401) {
    clearStoredPassword();
    window.location.reload();
    throw new Error("Invalid password — please log in again.");
  }

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
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearStoredPassword();
    window.location.reload();
    throw new Error("Invalid password — please log in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Backend error");
  }

  return res.json();
}

/**
 * GET request with auth header.
 * @param {string} endpoint  e.g. "/projects"
 * @returns {Promise<object>}
 */
export async function fetchBackend(endpoint) {
  const res = await fetch(`${BACKEND}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  if (res.status === 401) {
    clearStoredPassword();
    window.location.reload();
    throw new Error("Invalid password — please log in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Backend error");
  }

  return res.json();
}