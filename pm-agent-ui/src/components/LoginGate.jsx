// ─────────────────────────────────────────────────────────────────────────────
// components/LoginGate.jsx
//
// Wraps the entire app. Shows a password prompt if not authenticated.
// Password is stored in localStorage and injected into all API calls
// via authHeaders() in lib/claude.js.
//
// Usage in App.jsx:
//   import LoginGate from "./components/LoginGate";
//   export default function App() {
//     return <LoginGate><YourAppContent /></LoginGate>;
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { getStoredPassword, setStoredPassword, clearStoredPassword } from "../lib/claude";

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function LoginGate({ children }) {
  const [authed,   setAuthed]   = useState(false);
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [checking, setChecking] = useState(false);

  // On mount — check if a stored password is still valid
  useEffect(() => {
    const stored = getStoredPassword();
    if (!stored) {
      setLoading(false);
      return;
    }
    // Verify stored password against /health
    fetch(`${BACKEND}/health`, {
      headers: { "x-app-password": stored },
    })
      .then(res => {
        if (res.ok || res.status !== 401) {
          setAuthed(true); // password accepted (or auth disabled on backend)
        } else {
          clearStoredPassword();
        }
      })
      .catch(() => {
        // Network error — still let them try
        setAuthed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return;

    setChecking(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND}/health`, {
        headers: { "x-app-password": password.trim() },
      });

      if (res.status === 401) {
        setError("Incorrect password. Try again.");
        setChecking(false);
        return;
      }

      // Accepted
      setStoredPassword(password.trim());
      setAuthed(true);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.screen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={styles.icon}>🔒</div>
          <h1 style={styles.title}>PM Agent</h1>
          <p style={styles.subtitle}>Enter your access password to continue</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              type="submit"
              disabled={checking}
              style={{ ...styles.button, opacity: checking ? 0.7 : 1 }}
            >
              {checking ? "Checking..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}

// ── Inline styles — no Tailwind dependency ────────────────────────────────────

const styles = {
  screen: {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    minHeight:       "100vh",
    backgroundColor: "#0f1117",
  },
  card: {
    backgroundColor: "#1a1d27",
    border:          "1px solid #2a2d3a",
    borderRadius:    "12px",
    padding:         "40px 36px",
    width:           "100%",
    maxWidth:        "380px",
    textAlign:       "center",
  },
  icon: {
    fontSize:     "32px",
    marginBottom: "12px",
  },
  title: {
    color:        "#ffffff",
    fontSize:     "22px",
    fontWeight:   "600",
    margin:       "0 0 6px",
    fontFamily:   "system-ui, sans-serif",
  },
  subtitle: {
    color:        "#8b8fa8",
    fontSize:     "14px",
    margin:       "0 0 28px",
    fontFamily:   "system-ui, sans-serif",
  },
  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           "12px",
  },
  input: {
    backgroundColor: "#0f1117",
    border:          "1px solid #2a2d3a",
    borderRadius:    "8px",
    color:           "#ffffff",
    fontSize:        "15px",
    padding:         "11px 14px",
    outline:         "none",
    fontFamily:      "system-ui, sans-serif",
    width:           "100%",
    boxSizing:       "border-box",
  },
  button: {
    backgroundColor: "#6c63ff",
    border:          "none",
    borderRadius:    "8px",
    color:           "#ffffff",
    cursor:          "pointer",
    fontSize:        "15px",
    fontWeight:      "500",
    padding:         "11px",
    fontFamily:      "system-ui, sans-serif",
    transition:      "background 0.15s",
  },
  error: {
    color:      "#ff6b6b",
    fontSize:   "13px",
    margin:     "0",
    fontFamily: "system-ui, sans-serif",
  },
  spinner: {
    width:        "28px",
    height:       "28px",
    border:       "3px solid #2a2d3a",
    borderTop:    "3px solid #6c63ff",
    borderRadius: "50%",
    animation:    "spin 0.8s linear infinite",
  },
};
