// shared/SemanticSort.jsx
// Semantic Sort modal UI. All AI logic lives in hooks/useSemanticSort.js.

import { useSemanticSort } from "../hooks/useSemanticSort.js";

const BUCKETS = [
  { key: "pain",       label: "User Pain",        icon: "😤", color: "#FF4444", bg: "#FFF5F5", border: "#FFCCCC", desc: "What is the actual problem?" },
  { key: "feature",    label: "Feature Idea",     icon: "💡", color: "#FF8800", bg: "#FFF8F0", border: "#FFDDAA", desc: "What is the proposed solution?" },
  { key: "constraint", label: "Tech Constraint",  icon: "⚙️", color: "#0066FF", bg: "#F0F7FF", border: "#BBDDFF", desc: "No-gos or dependencies" },
  { key: "vibe",       label: "Vibe / Goal",      icon: "🎯", color: "#00AA44", bg: "#F0FFF6", border: "#AAEEBB", desc: "Emotional or strategic north star" },
];

export default function SemanticSortModal({ onClose, onApprove }) {
  const {
    step, rawInput, setRawInput,
    buckets, enhancements, searchStatus, error,
    sort, moveItem, removeItem, approve,
  } = useSemanticSort({ onApprove });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 860, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2a" }}>🧠 Semantic Sort</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
              {step === "input"      && "Paste your raw notes — the agent will categorise and research them"}
              {step === "sorting"    && "Categorising your input..."}
              {step === "review"     && "Review the buckets, then approve to generate your brief"}
              {step === "generating" && "Writing your structured brief..."}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#ccc", cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {error && (
            <div style={{ marginBottom: 14, padding: "9px 14px", background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 8, fontSize: 12, color: "#FF4444" }}>
              {error}
            </div>
          )}

          {/* Step 1: Input */}
          {step === "input" && (
            <div>
              <textarea
                autoFocus
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder={"Dump your raw notes here. Don't worry about structure — just write.\n\nExamples:\n• Users hate uploading CSVs every time they want a report\n• We need to integrate with Salesforce\n• No mobile app — web only\n• I want this to feel like magic, not a spreadsheet"}
                rows={10}
                style={{ width: "100%", padding: "14px 16px", fontSize: 13, fontFamily: "inherit", color: "#1a1a2a", lineHeight: 1.8, border: "1.5px solid #e0e0e0", borderRadius: 10, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={sort} disabled={!rawInput.trim()}
                  style={{ padding: "9px 24px", background: !rawInput.trim() ? "#e0e0e0" : "linear-gradient(135deg, #7B2FFF, #0066FF)", border: "none", borderRadius: 9, color: !rawInput.trim() ? "#aaa" : "#fff", fontSize: 13, fontWeight: 700, cursor: !rawInput.trim() ? "not-allowed" : "pointer" }}>
                  Sort My Notes →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Sorting */}
          {step === "sorting" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 14 }}>
              <div style={{ fontSize: 36, animation: "spin 1.5s linear infinite", display: "inline-block" }}>🧠</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a" }}>Categorising your notes...</div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === "review" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                {BUCKETS.map(b => (
                  <div key={b.key} style={{ background: b.bg, border: "1.5px solid " + b.border, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid " + b.border, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 16 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.label}</div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>{b.desc}</div>
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", color: b.color, background: "white", padding: "1px 6px", borderRadius: 8 }}>
                        {(buckets[b.key] || []).length}
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                      {(buckets[b.key] || []).length === 0 && (
                        <div style={{ fontSize: 11, color: "#ccc", fontStyle: "italic" }}>Nothing here</div>
                      )}
                      {(buckets[b.key] || []).map((item, i) => (
                        <div key={i} style={{ background: "#fff", border: "1px solid " + b.border, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#333", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ flex: 1 }}>{item}</span>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 1 }}>
                            {BUCKETS.filter(ob => ob.key !== b.key).map(ob => (
                              <button key={ob.key} onClick={() => moveItem(b.key, ob.key, item)} title={"Move to " + ob.label}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "0 1px", opacity: 0.5 }}>
                                {ob.icon}
                              </button>
                            ))}
                            <button onClick={() => removeItem(b.key, item)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#FF4444", padding: "0 1px", opacity: 0.6 }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhancements */}
              {(enhancements.length > 0 || searchStatus) && (
                <div style={{ background: "#F5F0FF", border: "1.5px solid #C4A8FF", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7B2FFF", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
                    ✦ Suggested Enhancements
                    {searchStatus && <span style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}>{searchStatus}</span>}
                  </div>
                  {enhancements.map((e, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < enhancements.length - 1 ? "1px solid #DDD0FF" : "none" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2a", marginBottom: 3 }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{e.description}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={onClose} style={{ padding: "8px 16px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, color: "#666", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={approve} style={{ padding: "8px 24px", background: "linear-gradient(135deg, #00AA44, #0066FF)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  ✓ Approve & Generate Brief →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Generating */}
          {step === "generating" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 14 }}>
              <div style={{ fontSize: 36, animation: "spin 1.5s linear infinite", display: "inline-block" }}>📝</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a" }}>Writing your structured brief...</div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
