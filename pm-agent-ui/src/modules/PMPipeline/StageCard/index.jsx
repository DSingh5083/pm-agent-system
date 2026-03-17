// StageCard/index.jsx
// Stage card UI — header, run button, expanded output, inline editing.
// Content rendering delegated to renderers.jsx.

import { useState, useEffect } from "react";
import InterviewModal from "../shared/InterviewModal.jsx";
import { SectionedText, TicketList, MermaidDiagram } from "./renderers.jsx";

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ getText }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: copied ? "#00AA4422" : "#f5f6f8", color: copied ? "#00AA44" : "#888", border: "1px solid " + (copied ? "#00AA4433" : "#e0e0e0"), cursor: "pointer" }}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Stage output router ───────────────────────────────────────────────────────

function StageOutput({ stage, result }) {
  if (stage.renderer === "tickets" && Array.isArray(result)) return <TicketList tickets={result} />;
  if (stage.renderer === "mermaid" && typeof result === "string") return <MermaidDiagram content={result} />;
  if (typeof result === "string") return <SectionedText content={result} color={stage.color} />;
  return null;
}

// ── Inline editor ─────────────────────────────────────────────────────────────

function InlineEditor({ stage, result, onSave, onCancel }) {
  const isTickets = stage.renderer === "tickets" && Array.isArray(result);
  const [draft, setDraft] = useState(
    isTickets ? JSON.stringify(result, null, 2) : (result || "")
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let parsed = draft;
      if (isTickets) {
        parsed = JSON.parse(draft);
      }
      await onSave(parsed);
    } catch (e) {
      setError(isTickets ? "Invalid JSON — check your syntax" : e.message);
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: "16px 20px", background: "#fafafa" }}>
      <div style={{ marginBottom: 8, fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
        <span>Editing {stage.label}</span>
        {isTickets && <span style={{ color: "#FF8800" }}>JSON format — edit carefully</span>}
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={Math.min(30, Math.max(10, draft.split("\n").length + 2))}
        style={{ width: "100%", padding: "12px 14px", fontSize: 12, fontFamily: isTickets ? "monospace" : "inherit", color: "#1a1a2a", lineHeight: 1.8, border: "1.5px solid " + stage.color, borderRadius: 8, outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fff" }}
      />
      {error && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#FF4444" }}>{error}</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: "6px 18px", background: saving ? "#ccc" : stage.color, border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={onCancel}
          style={{ padding: "6px 14px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 7, color: "#666", fontSize: 12, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Stage card ────────────────────────────────────────────────────────────────

export default function StageCard({ stage, result, loading, descriptionMissing, interviewEndpoint, runEndpoint, onResult }) {
  const [expanded,      setExpanded]      = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [saved,         setSaved]         = useState(false);
  const hasResult = result !== null && result !== undefined;

  useEffect(() => { if (hasResult) setExpanded(true); }, [hasResult]);
  // Close editor if result changes (e.g. after Redo)
  useEffect(() => { setEditing(false); }, [result]);

  const previewText = () => {
    if (!hasResult) return "";
    if (stage.renderer === "tickets" && Array.isArray(result)) return result.length + " tickets generated";
    if (stage.renderer === "mermaid") return "Visual diagrams ready";
    if (typeof result === "string") return result.slice(0, 160) + "...";
    return "";
  };

  const handleSave = async (updated) => {
    await onResult(updated);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Tickets renderer is JSON — edit as raw text, not inline sections
  const canEdit = hasResult && !loading && stage.renderer !== "mermaid";

  return (
    <>
      {showInterview && (
        <InterviewModal
          stage={stage}
          interviewEndpoint={interviewEndpoint}
          runEndpoint={runEndpoint}
          onComplete={(r) => { onResult(r); setShowInterview(false); }}
          onCancel={() => setShowInterview(false)}
        />
      )}

      <div style={{ background: "#fff", border: "1px solid " + stage.color + "20", borderRadius: 12, overflow: "hidden", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: "3px solid " + stage.color }}>

        {/* Card header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: stage.color + "05", borderBottom: (hasResult || loading) ? "1px solid " + stage.color + "10" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: stage.color + "15", border: "1.5px solid " + stage.color + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
              {stage.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 7 }}>
                {stage.label}
                {stage.useWebSearch && <span style={{ fontSize: 9, color: "#FF8800", background: "#FF880010", padding: "1px 6px", borderRadius: 8, border: "1px solid #FF880030", fontWeight: 600 }}>🌐 Live</span>}
                {hasResult && !editing && <span style={{ fontSize: 9, color: "#00AA44", fontFamily: "monospace" }}>✓ saved</span>}
                {saved && <span style={{ fontSize: 9, color: "#00AA44", fontFamily: "monospace" }}>✓ edited</span>}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{stage.description}</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {loading && <span style={{ fontSize: 11, color: stage.color, fontFamily: "monospace" }}>generating...</span>}
            {hasResult && !loading && (
              <>
                <CopyBtn getText={() => stage.renderer === "tickets" ? JSON.stringify(result, null, 2) : result} />
                {canEdit && !editing && (
                  <button onClick={() => { setExpanded(true); setEditing(true); }}
                    style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#555", border: "1px solid #e0e0e0", cursor: "pointer", fontWeight: 600 }}>
                    Edit
                  </button>
                )}
                {editing && (
                  <span style={{ fontSize: 11, color: stage.color, fontFamily: "monospace" }}>editing...</span>
                )}
                <button onClick={() => { setEditing(false); setShowInterview(true); }}
                  style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, background: "transparent", color: stage.color, border: "1px solid " + stage.color + "40", cursor: "pointer", fontWeight: 600 }}>
                  Redo
                </button>
                <button onClick={() => { setEditing(false); setExpanded(!expanded); }}
                  style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}>
                  {expanded ? "▲" : "▼"}
                </button>
              </>
            )}
            {!hasResult && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {descriptionMissing && <div style={{ fontSize: 10, color: "#FF8800", textAlign: "right", maxWidth: 160 }}>⚠️ Add a description first for specific output</div>}
                <button
                  onClick={() => !descriptionMissing && setShowInterview(true)}
                  disabled={descriptionMissing}
                  style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: descriptionMissing ? "#e8e8e8" : "linear-gradient(135deg, " + stage.color + "cc, " + stage.color + ")", color: descriptionMissing ? "#aaa" : "#fff", border: "none", cursor: descriptionMissing ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                  Run ↗
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Output — rendered or editing */}
        {hasResult && expanded && !editing && (
          <div style={{ padding: "16px 20px", background: "#fafafa" }}>
            <StageOutput stage={stage} result={result} />
          </div>
        )}
        {hasResult && expanded && editing && (
          <InlineEditor
            stage={stage}
            result={result}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        )}
        {hasResult && !expanded && (
          <div onClick={() => setExpanded(true)} style={{ padding: "10px 16px", fontSize: 12, color: "#999", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewText()}</span>
            <span style={{ color: stage.color, fontWeight: 600, flexShrink: 0 }}>Expand ↓</span>
          </div>
        )}
        {!hasResult && !loading && !descriptionMissing && (
          <div style={{ padding: "8px 16px", fontSize: 11, color: "#ccc", fontStyle: "italic" }}>
            Click Run — you'll be asked a few questions first to improve output quality
          </div>
        )}
      </div>
    </>
  );
}

// ── Section header (shared) ───────────────────────────────────────────────────

export function SectionHeader({ icon, title, subtitle, color, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "15", border: "1px solid " + color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2a" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#aaa" }}>{subtitle}</div>
      </div>
      {count > 0 && <span style={{ fontSize: 10, color, background: color + "15", padding: "2px 8px", borderRadius: 10, fontFamily: "monospace", fontWeight: 600 }}>{count} saved</span>}
    </div>
  );
}