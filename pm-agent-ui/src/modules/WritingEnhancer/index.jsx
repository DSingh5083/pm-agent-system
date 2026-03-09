// ─────────────────────────────────────────────────────────────────────────────
// modules/WritingEnhancer/index.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { callClaude } from "../../lib/claude.js";
import { SectionLabel, EmptyState, CopyButton, PillToggle } from "../../components/ui.jsx";

// ── Enhance Writing Config ────────────────────────────────────────────────────

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

// ── Stakeholder Config ────────────────────────────────────────────────────────

const STAKEHOLDERS = [
  {
    id:     "ceo",
    label:  "CEO",
    icon:   "👔",
    color:  "#0066FF",
    focus:  "Business impact, revenue generation, market opportunity, competitive advantage, ROI and strategic value",
    format: "Executive summary style — lead with business outcome, keep it under 150 words, no technical jargon",
  },
  {
    id:     "tech-lead",
    label:  "Tech Lead",
    icon:   "🧑‍💻",
    color:  "#8B00FF",
    focus:  "Technical architecture, scalability, implementation approach, tech debt, build speed, engineering trade-offs",
    format: "Technical and direct — include architecture considerations, potential risks, and suggested approach",
  },
  {
    id:     "ba",
    label:  "Business Analyst",
    icon:   "📋",
    color:  "#00AA44",
    focus:  "All business cases, edge cases, functional requirements, acceptance criteria, user flows and exceptions",
    format: "Detailed and structured — list all cases, flows, and scenarios clearly with numbered points",
  },
  {
    id:     "qa",
    label:  "QA Engineer",
    icon:   "🔬",
    color:  "#FF8800",
    focus:  "Test scenarios, edge cases to validate, regression risks, acceptance criteria, what could break and how to verify it",
    format: "Structured test thinking — list test cases, happy path, negative cases, and edge scenarios",
  },
  {
    id:     "designer",
    label:  "Designer",
    icon:   "🎨",
    color:  "#FF4444",
    focus:  "User experience, UI requirements, user journey, interaction patterns, visual considerations and accessibility",
    format: "UX-focused — describe the user journey, key screens, interactions and any design constraints",
  },
  {
    id:     "stakeholder",
    label:  "Stakeholder",
    icon:   "🤝",
    color:  "#555",
    focus:  "Project status, timeline, risks, dependencies and what decisions are needed from them",
    format: "Clear update style — what is happening, why it matters to them, and what you need from them",
  },
];

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

// ── Enhance Writing ───────────────────────────────────────────────────────────

function EnhanceWriting() {
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

Provide 3 variations. Format EXACTLY like this with no other text:

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
          body:  part.slice(nl + 1).trim(),
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

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left: Controls */}
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

      {/* Center: Input */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 28, background: "#f5f6f8" }}>
        <SectionLabel>Your Text</SectionLabel>
        <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Paste your email, Slack message, or any text here..." style={{ flex: 1, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 16, color: "#333", fontSize: 14, fontFamily: "inherit", lineHeight: 1.8, resize: "none", outline: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 16 }} />
        {error && <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FF444411", border: "1px solid #FF444433", borderRadius: 8, color: "#FF4444", fontSize: 13 }}>❌ {error}</div>}
        <button onClick={enhance} disabled={loading || !inputText.trim()} style={{ padding: 13, background: loading || !inputText.trim() ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)", border: "none", borderRadius: 8, color: loading || !inputText.trim() ? "#aaa" : "#fff", fontSize: 14, fontWeight: 700, cursor: loading || !inputText.trim() ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
          {loading ? "✨ Enhancing..." : "✨ Enhance Writing"}
        </button>
      </div>

      {/* Right: Output */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 28, background: "#fff", borderLeft: "1px solid #e8e8e8" }}>
        {variations.length > 0 ? (
          <>
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

// ── Stakeholder Translator ────────────────────────────────────────────────────

function StakeholderCard({ stakeholder, content, loading, onGenerate, canGenerate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: "#fff", border: `1px solid ${stakeholder.color}22`, borderRadius: 12, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: `4px solid ${stakeholder.color}` }}>

      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: `${stakeholder.color}06`, borderBottom: content || loading ? `1px solid ${stakeholder.color}11` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${stakeholder.color}15`, border: `1.5px solid ${stakeholder.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {stakeholder.icon}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a" }}>{stakeholder.label}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{stakeholder.focus.split(",")[0].trim()}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Generating spinner */}
          {loading && (
            <div style={{ fontSize: 12, color: stakeholder.color, fontFamily: "monospace" }}>generating...</div>
          )}

          {/* Copy + collapse when content exists */}
          {content && !loading && (
            <>
              <CopyButton getText={() => content} />
              <button
                onClick={() => onGenerate()}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, background: "transparent", color: stakeholder.color, border: `1px solid ${stakeholder.color}44`, cursor: "pointer", fontWeight: 600 }}
              >
                ↺ Redo
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, background: "#f5f6f8", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}
              >
                {expanded ? "▲ Collapse" : "▼ Expand"}
              </button>
            </>
          )}

          {/* Generate button when no content */}
          {!content && !loading && (
            <button
              onClick={() => onGenerate()}
              disabled={!canGenerate}
              style={{
                padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: canGenerate ? stakeholder.color : "#e8e8e8",
                color: canGenerate ? "#fff" : "#aaa",
                border: "none", cursor: canGenerate ? "pointer" : "not-allowed",
                boxShadow: canGenerate ? `0 2px 8px ${stakeholder.color}33` : "none",
                transition: "all 0.15s",
              }}
            >
              Generate ↗
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {content && expanded && (
        <div style={{ padding: "18px 20px", fontSize: 14, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "#fafafa" }}>
          {content}
        </div>
      )}

      {/* Collapsed preview */}
      {content && !expanded && (
        <div style={{ padding: "12px 18px", fontSize: 13, color: "#888", lineHeight: 1.6, cursor: "pointer" }} onClick={() => setExpanded(true)}>
          {content.slice(0, 140)}...
          <span style={{ color: stakeholder.color, marginLeft: 6, fontWeight: 600 }}>Read more</span>
        </div>
      )}

      {/* Empty hint */}
      {!content && !loading && (
        <div style={{ padding: "10px 18px", fontSize: 12, color: "#ccc", fontStyle: "italic" }}>
          {canGenerate ? "Click Generate to create this message" : "Enter your feature description to unlock"}
        </div>
      )}
    </div>
  );
}

function StakeholderTranslator() {
  const [featureContext, setFeatureContext] = useState("");
  const [loadingIds, setLoadingIds]         = useState([]);
  const [results, setResults]               = useState({});
  const [error, setError]                   = useState(null);

  const canGenerate = featureContext.trim().length > 0;

  const generateFor = async (stakeholder) => {
    if (!canGenerate) return;
    setLoadingIds(prev => [...prev, stakeholder.id]);
    setError(null);
    try {
      const result = await callClaude(
        `You are a product manager communicating a feature to a specific stakeholder.

FEATURE / CONTEXT:
${featureContext}

STAKEHOLDER: ${stakeholder.label}
THEIR FOCUS: ${stakeholder.focus}
FORMAT: ${stakeholder.format}

Write a clear, targeted message for this stakeholder. Focus only on what matters to them.
Do not include a subject line or greeting — just the message body.
Keep it concise and specific to their perspective.`, 1500
      );
      setResults(prev => ({ ...prev, [stakeholder.id]: result }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingIds(prev => prev.filter(id => id !== stakeholder.id));
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left: Input panel */}
      <div style={{ width: 340, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", padding: 24, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2a", marginBottom: 4 }}>Stakeholder Translator</div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, marginBottom: 20 }}>
          Describe your feature once. Then click <strong>Generate</strong> on whichever stakeholder you want a message for.
        </div>

        <SectionLabel>Feature or Update</SectionLabel>
        <textarea
          value={featureContext}
          onChange={e => { setFeatureContext(e.target.value); setResults({}); }}
          placeholder="e.g. We're adding a checkout flow with price breakdown, estimated delivery date, service type selection, add-ons like insurance and fragile handling, and signature on delivery. Ships in Sprint 4."
          rows={12}
          style={{ width: "100%", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 14px", color: "#333", fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 16 }}
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "#FF444411", border: "1px solid #FF444433", borderRadius: 8, color: "#FF4444", fontSize: 13 }}>
            ❌ {error}
          </div>
        )}

        {canGenerate ? (
          <div style={{ fontSize: 12, color: "#00AA44", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span>✓</span> Ready — click Generate on any card
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#bbb" }}>
            Enter your feature above to unlock Generate buttons
          </div>
        )}
      </div>

      {/* Right: Stakeholder cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28, background: "#f5f6f8" }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2a", marginBottom: 4 }}>Stakeholder Messages</h2>
          <p style={{ fontSize: 13, color: "#888" }}>
            {Object.keys(results).length > 0
              ? `${Object.keys(results).length} generated · click any card to expand`
              : "Generate messages one stakeholder at a time"}
          </p>
        </div>

        {STAKEHOLDERS.map(stakeholder => (
          <StakeholderCard
            key={stakeholder.id}
            stakeholder={stakeholder}
            content={results[stakeholder.id] || null}
            loading={loadingIds.includes(stakeholder.id)}
            canGenerate={canGenerate}
            onGenerate={() => generateFor(stakeholder)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Root with mode tabs ───────────────────────────────────────────────────────

const MODES = [
  { id: "enhance",     label: "Enhance Writing",       icon: "✍️" },
  { id: "stakeholder", label: "Stakeholder Translator", icon: "🔀" },
];

export default function WritingEnhancer() {
  const [mode, setMode] = useState("enhance");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>

      {/* Mode tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 28px", display: "flex", alignItems: "center", gap: 4, height: 48, flexShrink: 0 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: mode === m.id ? "#1a1a2a" : "transparent", color: mode === m.id ? "#fff" : "#666", border: "none", fontWeight: mode === m.id ? 600 : 400, transition: "all 0.15s" }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {mode === "enhance"     && <EnhanceWriting />}
        {mode === "stakeholder" && <StakeholderTranslator />}
      </div>
    </div>
  );
}