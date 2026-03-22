// src/modules/Features/CodeReadyStories.jsx
// Renders code-ready user stories below the PRD stage.
// Each story is an expandable card with 4 editable sections.

import { useState } from "react";
import { apiFetch, API } from "../../lib/apiClient";  // adjust path depth

// Safely convert any value to a renderable string
function safeStr(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val, null, 2);
}

// Normalise a value to a flat string array for display
function toDisplayLines(value) {
  if (Array.isArray(value)) return value.map(safeStr);
  if (typeof value === "object" && value !== null) return [JSON.stringify(value, null, 2)];
  return [safeStr(value)];
}

// Normalise a value to a string for textarea editing
function toDraftString(value) {
  if (Array.isArray(value)) return value.map(safeStr).join("\n");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return safeStr(value);
}

// ── Section editor ────────────────────────────────────────────────────────────

function EditableSection({ label, icon, value, onSave, multiline = true }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(toDraftString(value));

  const handleSave = () => {
    const saved = multiline && Array.isArray(value)
      ? draft.split("\n").filter(Boolean)
      : draft;
    onSave(saved);
    setEditing(false);
  };

  const display = toDisplayLines(value);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span>{label}
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ marginLeft: "auto", fontSize: 10, color: "#0066FF", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(4, display.length + 1)}
            style={{ width: "100%", padding: "8px 10px", fontSize: 12, fontFamily: "monospace", color: "#1a1a2a", lineHeight: 1.7, border: "1.5px solid #0066FF", borderRadius: 7, outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
            <button onClick={handleSave}
              style={{ padding: "4px 12px", background: "#0066FF", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Save
            </button>
            <button onClick={() => { setDraft(toDraftString(value)); setEditing(false); }}
              style={{ padding: "4px 10px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 6, color: "#888", fontSize: 11, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#f8f9fa", borderRadius: 7, padding: "9px 12px" }}>
          {display.map((line, i) => (
            <div key={i} style={{ fontSize: 12, color: "#333", lineHeight: 1.7, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── API handshake section ─────────────────────────────────────────────────────

function ApiSection({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(JSON.stringify(value || {}, null, 2));
  const [error,   setError]   = useState(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft);
      onSave(parsed);
      setEditing(false);
      setError(null);
    } catch {
      setError("Invalid JSON — check your syntax");
    }
  };

  const v = value || {};

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span>🔌</span>API Handshake
        {!editing && <button onClick={() => setEditing(true)} style={{ marginLeft: "auto", fontSize: 10, color: "#0066FF", background: "none", border: "none", cursor: "pointer" }}>Edit</button>}
      </div>
      {editing ? (
        <div>
          <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={10}
            style={{ width: "100%", padding: "8px 10px", fontSize: 11, fontFamily: "monospace", color: "#1a1a2a", lineHeight: 1.7, border: "1.5px solid #0066FF", borderRadius: 7, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          {error && <div style={{ fontSize: 11, color: "#FF4444", marginTop: 4 }}>{error}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
            <button onClick={handleSave} style={{ padding: "4px 12px", background: "#0066FF", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
            <button onClick={() => { setEditing(false); setError(null); }} style={{ padding: "4px 10px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 6, color: "#888", fontSize: 11, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#1a1a2a", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, color: "#4d88ff", fontFamily: "monospace" }}>{v.method} {v.endpoint}</div>
          {v.requestExample && (
            <div>
              <div style={{ fontSize: 9, color: "#ffffff40", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Request</div>
              <pre style={{ fontSize: 11, color: "#88CC88", fontFamily: "monospace", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{JSON.stringify(v.requestExample, null, 2)}</pre>
            </div>
          )}
          {v.responseExample && (
            <div>
              <div style={{ fontSize: 9, color: "#ffffff40", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Response</div>
              <pre style={{ fontSize: 11, color: "#FFD700", fontFamily: "monospace", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{JSON.stringify(v.responseExample, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Story card ────────────────────────────────────────────────────────────────

function StoryCard({ story, index, onChange }) {
  const [expanded, setExpanded] = useState(true);

  const update = (key, val) => onChange({ ...story, [key]: val });

  return (
    <div style={{ background: "#fff", border: "1.5px solid #0066FF18", borderRadius: 14, overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,102,255,0.06)" }}>

      {/* Story header */}
      <div style={{ padding: "14px 18px", background: "linear-gradient(135deg, #0066FF08, #7B2FFF05)", borderBottom: expanded ? "1px solid #f0f0f0" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #0066FF, #7B2FFF)", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>{safeStr(story.title)}</div>
          {story.persona && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{safeStr(story.persona)}</div>}
        </div>
        <span style={{ fontSize: 12, color: "#ccc" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "16px 18px" }}>

          {/* JTBD */}
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "#7B2FFF08", border: "1px solid #7B2FFF18", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#7B2FFF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>🎯 Job to be Done</div>
            <div style={{ fontSize: 12, color: "#333", lineHeight: 1.7, fontStyle: "italic" }}>{safeStr(story.job)}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <EditableSection
                label="Data Model" icon="🗄️"
                value={story.dataModel}
                onSave={val => update("dataModel", val)}
              />
              <EditableSection
                label="Acceptance Criteria" icon="✅"
                value={story.acceptanceCriteria}
                onSave={val => update("acceptanceCriteria", val)}
              />
            </div>
            <div>
              <ApiSection
                value={story.apiHandshake}
                onSave={val => update("apiHandshake", val)}
              />
              <EditableSection
                label="Edge Cases" icon="⚠️"
                value={story.edgeCases}
                onSave={val => update("edgeCases", val)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CodeReadyStories({ featureId, featureName, hasPrd, initialStories, onStoriesSaved }) {
  const [stories,     setStories]     = useState(initialStories || null);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [lastSaved,   setLastSaved]   = useState(null);
  const [error,       setError]       = useState(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res  = await apiFetch("/features/" + featureId + "/code-stories", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStories(data.stories);
      if (onStoriesSaved) onStoriesSaved(data.stories);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleChange = async (index, updated) => {
    const next = stories.map((s, i) => i === index ? updated : s);
    setStories(next);
    setSaving(true);
    await apiFetch( "/features/" + featureId + "/code-stories/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stories: next }),
    });
    setSaving(false);
    setLastSaved(new Date());
  };

  const downloadMarkdown = () => {
    const md = stories.map((s, i) => `
## Story ${i + 1}: ${s.title}

**Persona:** ${s.persona}

**Job to be Done:** ${s.job}

### 🗄️ Data Model
${Array.isArray(s.dataModel) ? s.dataModel.join("\n") : s.dataModel}

### 🔌 API Handshake
\`\`\`
${s.apiHandshake?.method} ${s.apiHandshake?.endpoint}

Request:
${JSON.stringify(s.apiHandshake?.requestExample, null, 2)}

Response:
${JSON.stringify(s.apiHandshake?.responseExample, null, 2)}
\`\`\`

### ✅ Acceptance Criteria
${(s.acceptanceCriteria || []).map(c => `- ${c}`).join("\n")}

### ⚠️ Edge Cases
${(s.edgeCases || []).map(e => `- ${e}`).join("\n")}
`).join("\n---\n");

    const blob = new Blob([`# Code-Ready Stories: ${featureName}\n\n` + md], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = featureName.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_stories.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 8, marginBottom: 24 }}>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "12px 16px", background: "#fff", border: "1.5px solid #0066FF22", borderRadius: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 8 }}>
            📋 Code-Ready Stories
            {stories && <span style={{ fontSize: 10, color: "#00AA44", fontFamily: "monospace" }}>{stories.length} stories</span>}
            {saving && <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>saving...</span>}
            {lastSaved && !saving && <span style={{ fontSize: 10, color: "#00AA44", fontFamily: "monospace" }}>saved ✓</span>}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
            Atomic stories with data model, API contract, acceptance criteria + edge cases
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {stories && (
            <button onClick={downloadMarkdown}
              style={{ padding: "6px 14px", background: "#1a1a2a", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ⬇ Download .md
            </button>
          )}
          <button onClick={generate} disabled={generating || !hasPrd}
            title={!hasPrd ? "Run the PRD stage first" : ""}
            style={{ padding: "6px 16px", background: generating || !hasPrd ? "#e8e8e8" : "linear-gradient(135deg, #0066FFcc, #0066FF)", border: "none", borderRadius: 8, color: generating || !hasPrd ? "#aaa" : "#fff", fontSize: 12, fontWeight: 700, cursor: generating || !hasPrd ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {generating ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span> Generating...</> : stories ? "↻ Regenerate" : "✦ Generate Stories"}
          </button>
        </div>
      </div>

      {!hasPrd && (
        <div style={{ padding: "10px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#FF8800", marginBottom: 12 }}>
          ⚠️ Run the PRD stage first — stories are generated from the PRD.
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 8, fontSize: 12, color: "#FF4444", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {generating && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 12, color: "#aaa" }}>
          <span style={{ fontSize: 32, animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Breaking down PRD into code-ready stories...</div>
          <div style={{ fontSize: 11, color: "#bbb" }}>Reading PRD · Writing data models · Defining API contracts</div>
        </div>
      )}

      {stories && !generating && stories.map((story, i) => (
        <StoryCard key={i} story={story} index={i} onChange={(updated) => handleChange(i, updated)} />
      ))}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}