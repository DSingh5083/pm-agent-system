// ─────────────────────────────────────────────────────────────────────────────
// modules/PMChat/index.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";

import { apiFetch, API } from "../../lib/apiClient";  // adjust path depth

const STARTERS = [
  { icon: "📄", label: "Review my PRD",              prompt: "Review my PRD and tell me what's missing, unclear, or needs strengthening. Be specific." },
  { icon: "🎯", label: "Sharpen problem statement",  prompt: "Help me write a sharp, clear problem statement based on my project context." },
  { icon: "✉️", label: "Draft stakeholder update",   prompt: "Draft a stakeholder update email based on my project context. Ask me who the audience is first." },
  { icon: "⚠️", label: "Identify top risks",         prompt: "What are the top 3-5 risks with this feature I should flag to the team?" },
  { icon: "🔢", label: "Prioritise with RICE",       prompt: "Help me score this feature using the RICE framework. Ask me the inputs you need." },
  { icon: "❓", label: "Discovery questions",        prompt: "What discovery questions should I be asking before writing the PRD for this?" },
  { icon: "✅", label: "Write acceptance criteria",  prompt: "Write detailed acceptance criteria for the feature in my project context." },
  { icon: "🗺️", label: "Challenge the roadmap",     prompt: "Look at my roadmap and challenge the sequencing. What would you change and why?" },
];

const PROJECT_STAGE_LABELS = {
  competitor:      "Competitor Intel",
  market_analysis: "Market Analysis",
  roadmap:         "Product Roadmap",
  gtm:             "Go To Market",
};

const FEATURE_STAGE_LABELS = {
  prd:          "PRD",
  architecture: "Technical Architecture",
  flow:         "High Level Flow",
  ui_spec:      "UI Spec",
  diagram:      "Visual Diagram",
  review:       "Spec Review",
  tickets:      "Tickets",
};

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, alignItems: "flex-end", gap: 8 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800 }}>P</div>
      )}
      <div style={{ maxWidth: "74%", background: isUser ? "linear-gradient(135deg, #0066FF, #8B00FF)" : "#fff", color: isUser ? "#fff" : "#1a1a2a", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "11px 14px", fontSize: 13, lineHeight: 1.75, boxShadow: isUser ? "0 2px 10px rgba(0,102,255,0.22)" : "0 1px 3px rgba(0,0,0,0.07)", border: isUser ? "none" : "1px solid #f0f0f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {message.content}
      </div>
      {isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "#1a1a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 800 }}>Y</div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800 }}>P</div>
      <div style={{ background: "#fff", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", border: "1px solid #f0f0f0", display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#0066FF", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
        <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}`}</style>
      </div>
    </div>
  );
}

function ContextPanel({ activeProject, activeFeature, projectOutputs, featureOutputs }) {
  const currentFeatureOutputs = activeFeature ? (featureOutputs[activeFeature.id] || {}) : {};
  const projectLoaded  = Object.keys(projectOutputs);
  const featureLoaded  = Object.keys(currentFeatureOutputs);

  return (
    <div style={{ width: 240, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a" }}>Active Context</div>
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>Auto-loaded from pipeline</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}>
        {!activeProject ? (
          <div style={{ fontSize: 11, color: "#FF8800", background: "#FF880008", border: "1px solid #FF880020", borderRadius: 8, padding: 10 }}>
            ⚠️ No project selected
          </div>
        ) : (
          <>
            {/* Project */}
            <div style={{ padding: "8px 10px", background: "#0066FF08", border: "1px solid #0066FF20", borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", marginBottom: 2 }}>📁 {activeProject.name}</div>
              {activeProject.description && (
                <div style={{ fontSize: 10, color: "#666", lineHeight: 1.5 }}>{activeProject.description.slice(0, 100)}{activeProject.description.length > 100 ? "..." : ""}</div>
              )}
            </div>

            {/* Project stages */}
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Project Strategy</div>
            {Object.entries(PROJECT_STAGE_LABELS).map(([id, label]) => {
              const has = !!projectOutputs[id];
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", borderRadius: 5, marginBottom: 2, background: has ? "#0066FF05" : "transparent" }}>
                  <span style={{ fontSize: 11 }}>{has ? "✓" : "–"}</span>
                  <span style={{ fontSize: 11, color: has ? "#333" : "#ccc", flex: 1 }}>{label}</span>
                  {has && <span style={{ fontSize: 9, color: "#0066FF", fontWeight: 700 }}>loaded</span>}
                </div>
              );
            })}

            {/* Active feature */}
            {activeFeature ? (
              <>
                <div style={{ borderTop: "1px solid #f0f0f0", margin: "10px 0 8px" }} />
                <div style={{ padding: "8px 10px", background: "#00AA4408", border: "1px solid #00AA4420", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#00AA44", marginBottom: 2 }}>⚙️ {activeFeature.name}</div>
                  {activeFeature.description && (
                    <div style={{ fontSize: 10, color: "#666", lineHeight: 1.5 }}>{activeFeature.description.slice(0, 80)}{activeFeature.description.length > 80 ? "..." : ""}</div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Feature Spec</div>
                {Object.entries(FEATURE_STAGE_LABELS).map(([id, label]) => {
                  const has = !!currentFeatureOutputs[id];
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", borderRadius: 5, marginBottom: 2, background: has ? "#00AA4405" : "transparent" }}>
                      <span style={{ fontSize: 11 }}>{has ? "✓" : "–"}</span>
                      <span style={{ fontSize: 11, color: has ? "#333" : "#ccc", flex: 1 }}>{label}</span>
                      {has && <span style={{ fontSize: 9, color: "#00AA44", fontWeight: 700 }}>loaded</span>}
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ marginTop: 10, fontSize: 11, color: "#bbb", lineHeight: 1.6, fontStyle: "italic" }}>
                Select a feature in the sidebar to load its PRD, tickets, and architecture into context.
              </div>
            )}

            {/* Summary */}
            {(projectLoaded.length + featureLoaded.length) > 0 && (
              <div style={{ marginTop: 12, padding: "8px 10px", background: "#00AA4408", border: "1px solid #00AA4420", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "#00AA44", fontWeight: 600 }}>
                  ✓ {projectLoaded.length + featureLoaded.length} stages in context
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>Ask anything specific to this project</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PMChat({ ps }) {
  const { activeProject, activeFeature, projectOutputs, featureOutputs, chatMessages, clearChat, setChatMessages } = ps;

  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput(""); setError(null);

    const updated = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(updated);
    setLoading(true);

    try {
      const res = await apiFetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          projectId:       activeProject?.id || null,
          activeFeatureId: activeFeature?.id  || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e.message);
      setChatMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Is the backend running?" }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const isEmpty = chatMessages.length === 0;
  const contextCount = Object.keys(projectOutputs).length +
    (activeFeature ? Object.keys(featureOutputs[activeFeature.id] || {}).length : 0);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>

      {/* Context panel */}
      <ContextPanel
        activeProject={activeProject}
        activeFeature={activeFeature}
        projectOutputs={projectOutputs}
        featureOutputs={featureOutputs}
      />

      {/* Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "10px 18px", background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", fontWeight: 800 }}>P</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>PM Assistant</div>
            <div style={{ fontSize: 11, color: "#00AA44", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00AA44", display: "inline-block" }} />
              {activeProject
                ? `${activeProject.name}${activeFeature ? ` · ${activeFeature.name}` : ""} · ${contextCount} stage${contextCount !== 1 ? "s" : ""} loaded`
                : "Online — select a project to load context"}
            </div>
          </div>
          {chatMessages.length > 0 && (
            <button onClick={clearChat} style={{ padding: "5px 10px", background: "none", border: "1px solid #e8e8e8", borderRadius: 6, fontSize: 11, color: "#999", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isEmpty && (
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2a", marginBottom: 4 }}>
                  {activeProject ? `Working on ${activeProject.name}${activeFeature ? ` · ${activeFeature.name}` : ""}` : "PM Assistant"}
                </div>
                <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
                  {contextCount > 0
                    ? `${contextCount} pipeline stage${contextCount > 1 ? "s" : ""} loaded. Ask me anything specific to this project.`
                    : "Run pipeline stages first, or just ask me anything."}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {STARTERS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.prompt)}
                    style={{ padding: "10px 12px", borderRadius: 9, textAlign: "left", background: "#fff", border: "1px solid #e8e8e8", cursor: "pointer", transition: "border-color 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    onMouseOver={e => e.currentTarget.style.borderColor = "#0066FF44"}
                    onMouseOut={e  => e.currentTarget.style.borderColor = "#e8e8e8"}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2a" }}>{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((m, i) => <MessageBubble key={i} message={m} />)}
          {loading && <TypingDots />}
          {error && <div style={{ textAlign: "center", fontSize: 11, color: "#FF4444", padding: 6 }}>❌ {error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 18px", background: "#fff", borderTop: "1px solid #e8e8e8", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={contextCount > 0 ? "Ask about your PRD, tickets, risks, roadmap..." : "Ask anything about PM..."}
              rows={2}
              style={{ flex: 1, background: "#f5f6f8", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: "10px 13px", color: "#1a1a2a", fontSize: 13, fontFamily: "inherit", lineHeight: 1.6, resize: "none", outline: "none", transition: "border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#0066FF"}
              onBlur={e  => e.target.style.borderColor = "#e0e0e0"}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", background: loading || !input.trim() ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: loading || !input.trim() ? "#bbb" : "#fff", boxShadow: loading || !input.trim() ? "none" : "0 2px 8px rgba(0,102,255,0.28)", transition: "all 0.2s" }}
            >↑</button>
          </div>
          <div style={{ fontSize: 10, color: "#ccc", marginTop: 4, textAlign: "right" }}>Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  );
}