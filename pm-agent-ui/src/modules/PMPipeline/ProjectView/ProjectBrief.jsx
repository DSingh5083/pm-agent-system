import { useState, useEffect, useRef } from "react";
import { apiFetch, API } from "../../../lib/api";  // adjust path depth
import SemanticSortModal from "../shared/SemanticSort.jsx";


export default function ProjectBrief({ value, onSave }) {
  const [draft,     setDraft]     = useState(value || "");
  const [saving,    setSaving]    = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [improving, setImproving] = useState(false);
  const [preview,   setPreview]   = useState(null);
  const [showSort,  setShowSort]  = useState(false);
  const timerRef                  = useRef(null);

  const skipSyncRef = useRef(null);

useEffect(() => {
  if (skipSyncRef.current) { skipSyncRef.current = false; return; }
  setDraft(value || "");
}, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setDraft(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      await onSave(val);
      setSaving(false);
      setLastSaved(new Date());
    }, 800);
  };

  const handleBlur = async (e) => {
    clearTimeout(timerRef.current);
    if (e.target.value === (value || "")) return;
    setSaving(true);
    await onSave(e.target.value);
    setSaving(false);
    setLastSaved(new Date());
  };

  const handleImprove = async () => {
    if (!draft.trim() || improving) return;
    setImproving(true);
    try {
      const res = await apiFetch( "/improve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: draft }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview({ original: draft, improved: data.improved });
    } catch (e) {
      alert("Improve failed: " + e.message);
    } finally {
      setImproving(false);
    }
  };

  const acceptImproved = async () => {
    const improved = preview.improved;
    setDraft(improved);
    setPreview(null);
    skipSyncRef.current = true; 
    setSaving(true);
    await onSave(improved);
    setSaving(false);
    setLastSaved(new Date());
  };

  const handleSortApprove = async (brief) => {
    setShowSort(false);
    setDraft(brief);
    skipSyncRef.current = true;
    setSaving(true);
    await onSave(brief);
    setSaving(false);
    setLastSaved(new Date());
  };

  const isReady = draft.trim().length > 0;
  const btnBase = { padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", transition: "all 0.15s" };

  return (
    <>
      {showSort && <SemanticSortModal onClose={() => setShowSort(false)} onApprove={handleSortApprove} />}

      <div style={{ marginBottom: 20, background: "#fff", border: "1.5px solid #0066FF22", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,102,255,0.05)" }}>

        {/* Header */}
        <div style={{ padding: "10px 16px", background: "#0066FF06", borderBottom: "1px solid #0066FF10", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 8 }}>
            Project Brief
            {!isReady && <span style={{ fontSize: 11, color: "#FF8800", fontWeight: 400 }}>Required to unlock stages</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#bbb", fontFamily: "monospace" }}>
              {saving ? "saving..." : lastSaved ? "auto-saved ✓" : "auto-saves as you type"}
            </div>
            {/* Semantic Sort button */}
            <button onClick={() => setShowSort(true)}
              style={{ ...btnBase, background: "linear-gradient(135deg, #7B2FFF22, #0066FF11)", color: "#7B2FFF", border: "1px solid #7B2FFF33" }}>
              🧠 Semantic Sort
            </button>
            {/* Improve button */}
            <button onClick={handleImprove} disabled={!draft.trim() || improving}
              style={{ ...btnBase, background: !draft.trim() || improving ? "#f0f0f0" : "linear-gradient(135deg, #7B2FFF, #0066FF)", color: !draft.trim() || improving ? "#bbb" : "#fff" }}>
              {improving
                ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span> Improving...</>
                : <>✦ Improve with AI</>}
            </button>
          </div>
        </div>

        {/* Textarea */}
        {!preview && (
          <textarea
            value={draft}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Describe your product — what it is, who it's for, what problem it solves, business goal, tech stack. Or click 'Semantic Sort' to paste raw notes and let the agent structure them."
            rows={4}
            style={{ width: "100%", padding: "14px 16px", fontSize: 13, fontFamily: "inherit", color: "#1a1a2a", lineHeight: 1.8, border: "none", outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fff" }}
          />
        )}

        {/* Improve preview */}
        {preview && (
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Original</div>
                <div style={{ padding: "12px 14px", background: "#fff5f5", border: "1px solid #FFB3B3", borderRadius: 8, fontSize: 12, color: "#888", lineHeight: 1.8, whiteSpace: "pre-wrap", minHeight: 80 }}>{preview.original}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#0066FF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>✦ AI Improved</div>
                <div style={{ padding: "12px 14px", background: "#f0f7ff", border: "1px solid #0066FF33", borderRadius: 8, fontSize: 12, color: "#1a1a2a", lineHeight: 1.8, whiteSpace: "pre-wrap", minHeight: 80 }}>{preview.improved}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={acceptImproved} style={{ padding: "7px 18px", background: "#0066FF", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ Use Improved Version</button>
              <button onClick={() => setPreview(null)} style={{ padding: "7px 14px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, color: "#666", fontSize: 13, cursor: "pointer" }}>Keep Original</button>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}

// ── Feature description input ──────────────────────────────────────────────────
