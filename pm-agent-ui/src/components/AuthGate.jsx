// src/components/AuthGate.jsx
// Simple password gate. Only active when APP_PASSWORD is set in server env.
// If not set, auth is skipped entirely (local dev mode).

import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STORAGE_KEY = "pm_agent_auth";

export default function AuthGate({ children }) {
  const [status,   setStatus]   = useState("checking"); // checking | authed | required
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    // Check if auth is required and if we have a stored token
    const stored = sessionStorage.getItem(STORAGE_KEY);
    check(stored);
  }, []);

  const check = async (token) => {
    try {
      const res = await fetch(API + "/health", {
        headers: token ? { "x-app-password": token } : {},
      });
      if (res.status === 401) {
        setStatus("required");
      } else {
        if (token) sessionStorage.setItem(STORAGE_KEY, token);
        setStatus("authed");
      }
    } catch {
      // Server unreachable — let app handle it
      setStatus("authed");
    }
  };

  const handleSubmit = async () => {
  const pw = password.trim();
  if (!pw) return;
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(API + "/health", {
      headers: { 
        "x-app-password": pw,
        "Content-Type": "application/json",
      },
    });
    if (res.status === 401) {
      setError("Incorrect password");
      setLoading(false);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, pw);
    setStatus("authed");
  } catch {
    setError("Could not reach server");
  } finally {
    setLoading(false);
  }
};
  if (status === "checking") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#0f1117" }}>
        <div style={{ fontSize: 13, color: "#ffffff30", fontFamily: "monospace" }}>Loading...</div>
      </div>
    );
  }

  if (status === "required") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#0f1117" }}>
        <div style={{ width: 340, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>PM Agent</div>
            <div style={{ fontSize: 12, color: "#ffffff40" }}>Enter your password to continue</div>
          </div>

          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Password"
            style={{ padding: "12px 16px", background: "#ffffff0a", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />

          {error && (
            <div style={{ fontSize: 12, color: "#FF4444", textAlign: "center" }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={loading || !password.trim()}
            style={{ padding: "12px", background: loading || !password.trim() ? "#ffffff10" : "#0066FF", border: "none", borderRadius: 10, color: loading || !password.trim() ? "#ffffff30" : "#fff", fontSize: 14, fontWeight: 700, cursor: loading || !password.trim() ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
            {loading ? "Checking..." : "Enter"}
          </button>
        </div>
      </div>
    );
  }

  return children;
}