// ─────────────────────────────────────────────────────────────────────────────
// modules/WritingEnhancer/index.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { callClaude } from "../../lib/claude.js";
import { SectionLabel, EmptyState, CopyButton, PillToggle } from "../../components/ui.jsx";

const TONES = [
  { id: "professional", label: "Professional", icon: "💼", desc: "Clear, formal, business-ready" },
  { id: "executive",    label: "Executive",    icon: "🎯", desc: "Concise, high-impact, for leadership" },
  { id: "friendly",     label: "Friendly",     icon: "😊", desc: "Warm, approachable, conversational" },
  { id: "assertive",    label: "Assertive",    icon: "💪", desc: "Direct, confident, action-oriented" },
  { id: "diplomatic",   label: "Diplomatic",   icon: "🤝", desc: "Tactful, balanced, considerate" },
];

const TYPES = [
  { id: "email",    label: "Email",         icon: "📧" },
  { id: "slack",    label: "Slack",         icon: "💬" },
  { id: "response", label: "Reply",         icon: "↩️" },
  { id: "feedback", label: "Feedback",      icon: "📝" },
  { id: "update",   label: "Status Update", icon: "📊" },
  { id: "ask",      label: "Request",       icon: "🙋" },
];

export default function WritingEnhancer() {
  const [inputText, setInputText]             = useState("");
  const [tone, setTone]                       = useState("professional");
  const [writingType, setWritingType]         = useState("email");
  const [context, setContext]                 = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [variations, setVariations]           = useState([]);
  const [activeVariation, setActiveVariation] = useState(0);

  const enhance = async () => {
    if (!inputText.trim()) return;
    setLoading(true); setVariations([]); setError(null);
    const selectedTone = TONES.find(t => t.id === tone);
    const selectedType = TYPES.find(t => t.id === writingType);
    try {
      const result = await callClaude(
        `You are an expert business writer. Enhance the following ${selectedType.label.toLowerCase()} to be more ${selectedTone.label.toLowerCase()}.

ORIGINAL TEXT:
${inputText}
${context ? `\nCONTEXT:\n${context}\n` : ""}
TONE: ${selectedTone.label} — ${selectedTone.desc}

Provide 3 variations. Format EXACTLY like this:

VARIATION 1: [Short label]
[text]

---

VARIATION 2: [Short label]
[text]

---

VARIATION 3: [Short label]
[text]`, 3000
      );
      const parts = result.split("---").map(p => p.trim()).filter(Boolean);
      const parsed = parts.map(part => {
        const nl = part.indexOf("\n");
        return {
          label: part.slice(0, nl).replace(/^VARIATION \d+:\s*/i, "").trim(),
          body: part.slice(nl + 1).trim(),
        };
      });
      setVariations(parsed);
      setActiveVariation(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* ── Left: Controls ── */}
      <div style={{ width: 280, background: "#fff", borderRight: "1px solid #e8e8e8", overflowY: "auto", padding: 24, flexShrink: 0 }}>
        <SectionLabel>Writing Type</SectionLabel>
        <div style={{ marginBottom: 20 }}>
          <PillToggle options={TYPES} value={writingType} onChange={setWritingType} />
        </div>

        <SectionLabel>Tone</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {TONES.map(t => (
            <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: "9px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: tone === t.id ? "#0066FF08" : "#f5f6f8", border: `1.5px solid ${tone === t.id ? "#0066FF" : "#e8e8e8"}`, textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <div>
                <div style={{ fontWeight: tone === t.id ? 700 : 500, color: tone === t.id ? "#0066FF" : "#333", fontSize: 13 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <SectionLabel>Context (optional)</SectionLabel>
        <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. Following up after a missed deadline..." rows={3} style={{ width: "100%", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 12px", color: "#333", fontSize: 13, fontFamily: "inherit", lineHeight: 1.6, resize: "none", outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* ── Center: Input ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 28, background: "#f5f6f8" }}>
        <SectionLabel>Your Text</SectionLabel>
        <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Paste your email, Slack message, or any text here..." style={{ flex: 1, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 16, color: "#333", fontSize: 14, fontFamily: "inherit", lineHeight: 1.8, resize: "none", outline: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 16 }} />
        {error && <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FF444411", border: "1px solid #FF444433", borderRadius: 8, color: "#FF4444", fontSize: 13 }}>❌ {error}</div>}
        <button onClick={enhance} disabled={loading || !inputText.trim()} style={{ padding: 13, background: loading || !inputText.trim() ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)", border: "none", borderRadius: 8, color: loading || !inputText.trim() ? "#aaa" : "#fff", fontSize: 14, fontWeight: 700, cursor: loading || !inputText.trim() ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
          {loading ? "✨ Enhancing..." : "✨ Enhance Writing"}
        </button>
      </div>

      {/* ── Right: Output ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 28, background: "#fff", borderLeft: "1px solid #e8e8e8" }}>
        {variations.length > 0 ? (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexShrink: 0 }}>
              {variations.map((v, i) => (
                <button key={i} onClick={() => setActiveVariation(i)} style={{ flex: 1, padding: "7px 6px", borderRadius: 8, fontSize: 11, cursor: "pointer", border: `1.5px solid ${activeVariation === i ? "#0066FF" : "#e0e0e0"}`, background: activeVariation === i ? "#0066FF08" : "#f5f6f8", color: activeVariation === i ? "#0066FF" : "#666", fontWeight: activeVariation === i ? 700 : 400, transition: "all 0.15s", textAlign: "center" }}>
                  {v.label || `Option ${i + 1}`}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Enhanced · {TONES.find(t => t.id === tone)?.label}
              </div>
              <CopyButton getText={() => variations[activeVariation]?.body || ""} />
            </div>

            <div style={{ flex: 1, overflowY: "auto", fontSize: 14, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "#f9f9fb", borderRadius: 10, padding: 20, border: "1px solid #e8e8e8" }}>
              {variations[activeVariation]?.body}
            </div>

            {/* Word count */}
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexShrink: 0 }}>
              <div style={{ flex: 1, background: "#f5f6f8", border: "1px solid #e8e8e8", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", marginBottom: 2 }}>ORIGINAL</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#888" }}>{wordCount(inputText)} words</div>
              </div>
              <div style={{ flex: 1, background: "#0066FF08", border: "1px solid #0066FF33", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#0066FF", fontFamily: "monospace", marginBottom: 2 }}>ENHANCED</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0066FF" }}>{wordCount(variations[activeVariation]?.body || "")} words</div>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon="✍️" title="Enhanced text appears here" subtitle="3 variations · ready to copy" loading={loading} loadingText="Enhancing your writing..." />
        )}
      </div>
    </div>
  );
}
