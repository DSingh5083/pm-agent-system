// src/modules/Features/CodeReadyPRD.jsx
// Sits below the PRD stage card.
// Accepts UI screenshots + reads the General PRD → generates a Code-Ready PRD.
// Editable inline, downloadable as .md.

import { useState, useRef } from "react";
import { API } from "../PMPipeline/constants.js";

// ── Screenshot uploader ───────────────────────────────────────────────────────

function ScreenshotUploader({ screenshots, onChange }) {
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, 5 - screenshots.length);
    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(",")[1];
        const mediaType = file.type || "image/png";
        onChange(prev => [...prev, { data: base64, mediaType, name: file.name, preview: e.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const remove = (i) => onChange(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        UI Screenshots <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional · up to 5)</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        {screenshots.map((s, i) => (
          <div key={i} style={{ position: "relative", width: 90, height: 70, borderRadius: 8, overflow: "hidden", border: "1.5px solid #e0e0e0", flexShrink: 0 }}>
            <img src={s.preview} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={() => remove(i)}
              style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
              ×
            </button>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "2px 4px", fontSize: 9, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </div>
          </div>
        ))}

        {screenshots.length < 5 && (
          <button onClick={() => inputRef.current?.click()}
            style={{ width: 90, height: 70, borderRadius: 8, border: "2px dashed #e0e0e0", background: "#fafafa", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#bbb", fontSize: 11, flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#0066FF"; e.currentTarget.style.color = "#0066FF"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#bbb"; }}>
            <span style={{ fontSize: 22 }}>+</span>
            <span>Add UI</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

// ── Section renderer ──────────────────────────────────────────────────────────

const SECTION_COLORS = {
  "Component-to-Logic Mapping": "#0066FF",
  "Technical Contract":         "#0099AA",
  "State Machine Definition":   "#7B2FFF",
  "Edge Case Matrix":           "#FF8800",
  "Atomic Implementation Plan": "#00AA44",
};

function SectionBlock({ title, content, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(content);
  const color = Object.entries(SECTION_COLORS).find(([k]) => title.includes(k))?.[1] || "#888";

  const save = () => { onEdit(draft); setEditing(false); };

  // Render markdown tables simply
  const renderContent = (text) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (/^\|.+\|$/.test(line.trim()) && !/^[\|:\- ]+$/.test(line.trim())) {
        const cells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        return (
          <div key={i} style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
            {cells.map((cell, j) => (
              <div key={j} style={{ flex: 1, padding: "5px 8px", fontSize: 12, color: "#333", lineHeight: 1.5, borderRight: j < cells.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                {cell}
              </div>
            ))}
          </div>
        );
      }
      if (/^[\|:\- ]+$/.test(line.trim()) && line.includes("|")) return null; // separator row
      if (/^\d+\.\s/.test(line)) return <div key={i} style={{ fontSize: 12, color: "#333", lineHeight: 1.8, padding: "2px 0", paddingLeft: 4 }}>{line}</div>;
      if (/^[-*]\s/.test(line)) return <div key={i} style={{ fontSize: 12, color: "#444", lineHeight: 1.7, padding: "1px 0 1px 12px" }}>• {line.slice(2)}</div>;
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      return <div key={i} style={{ fontSize: 12, color: "#444", lineHeight: 1.7 }}>{line}</div>;
    });
  };

  return (
    <div style={{ marginBottom: 16, background: "#fff", border: `1.5px solid ${color}20`, borderRadius: 10, overflow: "hidden", borderLeft: `3px solid ${color}` }}>
      <div style={{ padding: "10px 14px", background: `${color}06`, borderBottom: `1px solid ${color}10`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
        {!editing
          ? <button onClick={() => setEditing(true)} style={{ fontSize: 11, color, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>Edit</button>
          : <div style={{ display: "flex", gap: 6 }}>
              <button onClick={save} style={{ fontSize: 11, padding: "2px 10px", background: color, border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Save</button>
              <button onClick={() => { setDraft(content); setEditing(false); }} style={{ fontSize: 11, padding: "2px 8px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 5, color: "#888", cursor: "pointer" }}>Cancel</button>
            </div>
        }
      </div>
      <div style={{ padding: "12px 14px" }}>
        {editing
          ? <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              rows={Math.max(6, content.split("\n").length)}
              style={{ width: "100%", padding: "8px 10px", fontSize: 12, fontFamily: "monospace", color: "#1a1a2a", lineHeight: 1.7, border: "1.5px solid " + color, borderRadius: 7, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          : <div>{renderContent(content)}</div>
        }
      </div>
    </div>
  );
}

// ── Parse markdown into sections ──────────────────────────────────────────────

function parseSections(markdown) {
  const parts = markdown.split(/\n(?=## \d+\.)/).filter(Boolean);
  return parts.map(part => {
    const nl      = part.indexOf("\n");
    const heading = part.slice(0, nl).replace(/^##\s*\d+\.\s*/, "").trim();
    const body    = part.slice(nl + 1).trim();
    return { heading, body };
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CodeReadyPRD({ featureId, featureName, hasPrd, initialContent, onSaved }) {
  const [screenshots, setScreenshots] = useState([]);
  const [content,     setContent]     = useState(initialContent || null);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [lastSaved,   setLastSaved]   = useState(null);
  const [error,       setError]       = useState(null);
  const [rawView,     setRawView]     = useState(false);
  const [rawDraft,    setRawDraft]    = useState(initialContent || "");

  const sections = content ? parseSections(content) : [];

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res  = await fetch(API + "/features/" + featureId + "/code-ready-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshots: screenshots.map(s => ({ data: s.data, mediaType: s.mediaType })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContent(data.content);
      setRawDraft(data.content);
      if (onSaved) onSaved(data.content);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const saveSection = async (index, newBody) => {
    const updated = sections.map((s, i) =>
      i === index ? `## ${i + 1}. ${s.heading}\n${newBody}` : `## ${i + 1}. ${s.heading}\n${s.body}`
    ).join("\n\n");
    setContent(updated);
    setRawDraft(updated);
    setSaving(true);
    await fetch(API + "/features/" + featureId + "/code-ready-prd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updated }),
    });
    setSaving(false);
    setLastSaved(new Date());
    if (onSaved) onSaved(updated);
  };

  const saveRaw = async () => {
    setContent(rawDraft);
    setSaving(true);
    await fetch(API + "/features/" + featureId + "/code-ready-prd/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: rawDraft }),
    });
    setSaving(false);
    setLastSaved(new Date());
    setRawView(false);
    if (onSaved) onSaved(rawDraft);
  };

  const download = () => {
    const blob = new Blob([`# Code-Ready PRD: ${featureName}\n\n${content}`], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = featureName.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_code_ready_prd.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 4, marginBottom: 20 }}>

      {/* Header card */}
      <div style={{ background: "#fff", border: "1.5px solid #0099AA22", borderRadius: 12, overflow: "hidden", marginBottom: content ? 12 : 0 }}>
        <div style={{ padding: "12px 16px", background: "#0099AA06", borderBottom: "1px solid #0099AA10", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 8 }}>
              🔧 Code-Ready PRD
              {content && <span style={{ fontSize: 10, color: "#00AA44", fontFamily: "monospace" }}>generated</span>}
              {saving && <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>saving...</span>}
              {lastSaved && !saving && <span style={{ fontSize: 10, color: "#00AA44", fontFamily: "monospace" }}>saved ✓</span>}
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
              Component mapping · API contracts · State machine · Edge cases · Implementation plan
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {content && (
              <>
                <button onClick={() => setRawView(v => !v)}
                  style={{ padding: "5px 12px", background: rawView ? "#1a1a2a" : "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 7, color: rawView ? "#fff" : "#666", fontSize: 11, cursor: "pointer" }}>
                  {rawView ? "Structured View" : "Raw Edit"}
                </button>
                <button onClick={download}
                  style={{ padding: "5px 12px", background: "#1a1a2a", border: "none", borderRadius: 7, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  ⬇ .md
                </button>
              </>
            )}
            <button onClick={generate} disabled={generating || !hasPrd}
              title={!hasPrd ? "Run the PRD stage first" : ""}
              style={{ padding: "6px 16px", background: generating || !hasPrd ? "#e8e8e8" : "linear-gradient(135deg, #0099AAcc, #0099AA)", border: "none", borderRadius: 8, color: generating || !hasPrd ? "#aaa" : "#fff", fontSize: 12, fontWeight: 700, cursor: generating || !hasPrd ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {generating
                ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span> Generating...</>
                : content ? "↻ Regenerate" : "✦ Generate Code-Ready PRD"}
            </button>
          </div>
        </div>

        {/* Screenshot uploader + warning */}
        <div style={{ padding: "14px 16px" }}>
          {!hasPrd && (
            <div style={{ marginBottom: 12, padding: "9px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#FF8800" }}>
              ⚠️ Run the PRD stage first — the Code-Ready PRD is generated from it.
            </div>
          )}
          <ScreenshotUploader screenshots={screenshots} onChange={setScreenshots} />
          {screenshots.length === 0 && (
            <div style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>
              No screenshots — the PRD will be generated from the General PRD text only. Add UI screenshots for Component-to-Logic Mapping accuracy.
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 14px", background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 8, fontSize: 12, color: "#FF4444", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Generating spinner */}
      {generating && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 12, color: "#aaa", background: "#fff", borderRadius: 12, border: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: 32, animation: "spin 1s linear infinite", display: "inline-block" }}>🔧</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Generating Code-Ready PRD...</div>
          <div style={{ fontSize: 11, color: "#bbb", textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
            Mapping UI components → Defining API contracts → Writing state machine → Identifying edge cases
          </div>
        </div>
      )}

      {/* Content */}
      {content && !generating && (
        rawView ? (
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, overflow: "hidden" }}>
            <textarea
              value={rawDraft}
              onChange={e => setRawDraft(e.target.value)}
              rows={30}
              style={{ width: "100%", padding: "16px 18px", fontSize: 12, fontFamily: "monospace", color: "#1a1a2a", lineHeight: 1.8, border: "none", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => { setRawDraft(content); setRawView(false); }}
                style={{ padding: "5px 14px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 7, color: "#666", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveRaw}
                style={{ padding: "5px 16px", background: "#0099AA", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            {sections.length > 0
              ? sections.map((s, i) => (
                  <SectionBlock
                    key={i}
                    title={`${i + 1}. ${s.heading}`}
                    content={s.body}
                    onEdit={(newBody) => saveSection(i, newBody)}
                  />
                ))
              : <div style={{ padding: "16px 18px", background: "#fff", borderRadius: 12, border: "1px solid #e0e0e0" }}>
                  <pre style={{ fontSize: 12, fontFamily: "monospace", color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{content}</pre>
                </div>
            }
          </div>
        )
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
