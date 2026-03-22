const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STORAGE_KEY = "pm_agent_auth";

function authHeaders() {
  const pw = sessionStorage.getItem(STORAGE_KEY) || "";
  return pw ? { "x-app-password": pw } : {};
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.reload();
    throw new Error("Session expired — please log in again.");
  }

  return res;
}

export { API };
