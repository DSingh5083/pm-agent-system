// ─────────────────────────────────────────────────────────────────────────────
// modules/PMChat/index.jsx
// Project/feature selector added at top — switch context without leaving Assistant.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "../../lib/apiClient";

const STARTERS = [
  { icon: "📄", label: "Review my PRD",             prompt: "Review my PRD and tell me what's missing, unclear, or needs strengthening. Be specific." },
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

// ── Context selector ──────────────────────────────────────────────────────────

function ContextSelector({ ps, selectedProject, selectedFeature, onProjectChange, onFeatureChange }) {
  const { projects, features, loadProject } = ps;

  const handleProjectChange = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      await loadProject(project);
      onProjectChange(project);
      onFeatureChange(null);
    }
  };

  const handleFeatureChange = (featureId) => {
    const feature = features.find(f => f.id === featureId);
    onFeatureChange(feature || null);
  };

  return (
    <div style={{ padding: "10px 18px", background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Context</span>

      {/* Project selector */}
      <select
        value={selectedProject?.id || ""}
        onChange={e => handleProjectChange(e.target.value)}
        style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 12, color: "#1a1a2a", background: "#f5f6f8", cursor: "pointer", outline: "none", fontFamily: "inherit" }}
      >
        <option value="">— Select project —</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Feature selector — only shown when project selected */}
      {selectedProject && features.length > 0 && (
        <>
          <span style={{ color: "#ccc", fontSize: 14 }}>›</span>
          <select
            value={selectedFeature?.id || ""}
            onChange={e => handleFeatureChange(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 12, color: "#1a1a2a", background: "#f5f6f8", cursor: "pointer", outline: "none", fontFamily: "inherit" }}
          >
            <option value="">— All features —</option>
            {features.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </>
      )}

      {selectedProject && (
        <span style={{ fontSize: 11, color: "#00AA44", marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00AA44", display: "inline-block" }} />
          Context loaded
        </span>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

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

// ── Context panel ─────────────────────────────────────────────────────────────

function ContextPanel({ activeProject, activeFeature, projectOutputs, featureOutputs }) {
  const currentFeatureOutputs = activeFeature ? (featureOutputs[activeFeature.id] || {}) : {};
  const projectLoaded = Object.keys(projectOutputs);
  const featureLoaded = Object.keys(currentFeatureOutputs);

  return (
    <div style={{ width: 220, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2a" }}>Loaded Context</div>
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>Auto-loaded from pipeline</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 8px" }}>
        {!activeProject ? (
          <div style={{ fontSize: 11, color: "#FF8800", background: "#FF880008", border: "1px solid #FF880020", borderRadius: 8, padding: 10 }}>
            ⚠️ Select a project above
          </div>
        ) : (
          <>
            <div style={{ padding: "7px 9px", background: "#0066FF08", border: "1px solid #0066FF20", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", marginBottom: 1 }}>📁 {activeProject.name}</div>
              {activeProject.description && (
                <div style={{ fontSize: 10, color: "#666", lineHeight: 1.4 }}>{activeProject.description.slice(0, 80)}...</div>
              )}
            </div>

            <div style={{ fontSize: 9, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Project Stages</div>
            {Object.entries(PROJECT_STAGE_LABELS).map(([id, label]) => {
              const has = !!projectOutputs[id];
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 5px", borderRadius: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 10 }}>{has ? "✓" : "–"}</span>
                  <span style={{ fontSize: 10, color: has ? "#333" : "#ccc", flex: 1 }}>{label}</span>
                  {has && <span style={{ fontSize: 8, color: "#0066FF", fontWeight: 700 }}>✓</span>}
                </div>
              );
            })}

            {activeFeature && (
              <>
                <div style={{ borderTop: "1px solid #f0f0f0", margin: "8px 0 6px" }} />
                <div style={{ padding: "7px 9px", background: "#00AA4408", border: "1px solid #00AA4420", borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#00AA44" }}>⚙️ {activeFeature.name}</div>
                </div>
                <div style={{ fontSize: 9, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Feature Stages</div>
                {Object.entries(FEATURE_STAGE_LABELS).map(([id, label]) => {
                  const has = !!currentFeatureOutputs[id];
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 5px", borderRadius: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 10 }}>{has ? "✓" : "–"}</span>
                      <span style={{ fontSize: 10, color: has ? "#333" : "#ccc", flex: 1 }}>{label}</span>
                      {has && <span style={{ fontSize: 8, color: "#00AA44", fontWeight: 700 }}>✓</span>}
                    </div>
                  );
                })}
              </>
            )}

            {(projectLoaded.length + featureLoaded.length) > 0 && (
              <div style={{ marginTop: 10, padding: "7px 9px", background: "#00AA4408", border: "1px solid #00AA4420", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "#00AA44", fontWeight: 600 }}>
                  ✓ {projectLoaded.length + featureLoaded.length} stages in context
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Chat tab ─────────────────────────────────────────────────────────────────

function ChatTab({ ps, localProject, localFeature }) {
  const { projectOutputs, featureOutputs, chatMessages, clearChat, setChatMessages } = ps;

  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, loading]);

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
          messages:        updated,
          projectId:       localProject?.id || null,
          activeFeatureId: localFeature?.id  || null,
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

  const isEmpty       = chatMessages.length === 0;
  const contextCount  = Object.keys(projectOutputs).length +
    (localFeature ? Object.keys(featureOutputs[localFeature.id] || {}).length : 0);

  const contextCount = Object.keys(projectOutputs).length +
    (localFeature ? Object.keys(featureOutputs[localFeature.id] || {}).length : 0);
  const isEmpty = chatMessages.length === 0;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <ContextPanel activeProject={localProject} activeFeature={localFeature} projectOutputs={projectOutputs} featureOutputs={featureOutputs} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Chat header */}
          <div style={{ padding: "10px 18px", background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", fontWeight: 800 }}>P</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>PM Assistant</div>
              <div style={{ fontSize: 11, color: "#00AA44", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00AA44", display: "inline-block" }} />
                {localProject
                  ? `${localProject.name}${localFeature ? ` · ${localFeature.name}` : ""} · ${contextCount} stage${contextCount !== 1 ? "s" : ""} loaded`
                  : "Select a project above to load context"}
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
              <div style={{ maxWidth: 540, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2a", marginBottom: 4 }}>
                    {localProject ? `Working on ${localProject.name}${localFeature ? ` · ${localFeature.name}` : ""}` : "PM Assistant"}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
                    {contextCount > 0
                      ? `${contextCount} pipeline stage${contextCount > 1 ? "s" : ""} loaded. Ask me anything specific to this project.`
                      : "Select a project above, or just ask me anything."}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {STARTERS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s.prompt)}
                      style={{ padding: "10px 12px", borderRadius: 9, textAlign: "left", background: "#fff", border: "1px solid #e8e8e8", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                      onMouseOver={e => e.currentTarget.style.borderColor = "#0066FF44"}
                      onMouseOut={e  => e.currentTarget.style.borderColor = "#e8e8e8"}>
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
                style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", background: loading || !input.trim() ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: loading || !input.trim() ? "#bbb" : "#fff", transition: "all 0.2s" }}>
                ↑
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#ccc", marginTop: 4, textAlign: "right" }}>Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stakeholder config ────────────────────────────────────────────────────────

const STAKEHOLDERS = [
  { id: "ceo",         label: "CEO",              icon: "👔", color: "#0066FF", focus: "Business impact, revenue, market opportunity, ROI and strategic value",                                format: "Executive summary — lead with business outcome, under 150 words, no technical jargon" },
  { id: "tech-lead",   label: "Tech Lead",        icon: "🧑‍💻", color: "#8B00FF", focus: "Technical architecture, scalability, implementation approach, tech debt, engineering trade-offs",   format: "Technical and direct — include architecture considerations, risks, and suggested approach" },
  { id: "ba",          label: "Business Analyst", icon: "📋", color: "#00AA44", focus: "Business cases, edge cases, functional requirements, acceptance criteria, user flows and exceptions", format: "Detailed and structured — list all cases, flows, and scenarios with numbered points" },
  { id: "qa",          label: "QA Engineer",      icon: "🔬", color: "#FF8800", focus: "Test scenarios, edge cases, regression risks, acceptance criteria, what could break",                format: "Structured test thinking — list test cases, happy path, negative cases, edge scenarios" },
  { id: "designer",    label: "Designer",         icon: "🎨", color: "#FF4444", focus: "User experience, UI requirements, user journey, interaction patterns, accessibility",                format: "UX-focused — describe user journey, key screens, interactions and design constraints" },
  { id: "stakeholder", label: "Stakeholder",      icon: "🤝", color: "#555",    focus: "Project status, timeline, risks, dependencies and what decisions are needed from them",              format: "Clear update style — what is happening, why it matters, and what you need from them" },
];

function StakeholderCard({ stakeholder, content, loading, canGenerate, onGenerate }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "#fff", border: `1px solid ${stakeholder.color}22`, borderRadius: 12, overflow: "hidden", marginBottom: 12, borderLeft: `4px solid ${stakeholder.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: `${stakeholder.color}06`, borderBottom: (content || loading) ? `1px solid ${stakeholder.color}11` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${stakeholder.color}15`, border: `1.5px solid ${stakeholder.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{stakeholder.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>{stakeholder.label}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{stakeholder.focus.split(",")[0].trim()}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <span style={{ fontSize: 11, color: stakeholder.color, fontFamily: "monospace" }}>generating...</span>}
          {content && !loading && (
            <>
              <button onClick={() => navigator.clipboard.writeText(content)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#888", border: "1px solid #e0e0e0", cursor: "pointer" }}>Copy</button>
              <button onClick={onGenerate} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "transparent", color: stakeholder.color, border: `1px solid ${stakeholder.color}44`, cursor: "pointer", fontWeight: 600 }}>↺ Redo</button>
              <button onClick={() => setExpanded(!expanded)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}>{expanded ? "▲" : "▼"}</button>
            </>
          )}
          {!content && !loading && (
            <button onClick={onGenerate} disabled={!canGenerate}
              style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: canGenerate ? stakeholder.color : "#e8e8e8", color: canGenerate ? "#fff" : "#aaa", border: "none", cursor: canGenerate ? "pointer" : "not-allowed" }}>
              Generate ↗
            </button>
          )}
        </div>
      </div>
      {content && expanded && <div style={{ padding: "16px 18px", fontSize: 13, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "#fafafa" }}>{content}</div>}
      {content && !expanded && <div style={{ padding: "10px 16px", fontSize: 12, color: "#888", cursor: "pointer" }} onClick={() => setExpanded(true)}>{content.slice(0, 140)}... <span style={{ color: stakeholder.color, fontWeight: 600 }}>Read more</span></div>}
      {!content && !loading && <div style={{ padding: "8px 16px", fontSize: 11, color: "#ccc", fontStyle: "italic" }}>{canGenerate ? "Click Generate to create this message" : "Select a project above to unlock"}</div>}
    </div>
  );
}

function StakeholderTab({ localProject, localFeature, projectOutputs, featureOutputs }) {
  const buildDefaultContext = () => {
    const parts = [];
    const fo = localFeature ? (featureOutputs[localFeature.id] || {}) : {};
    if (localProject?.name)        parts.push("PROJECT: " + localProject.name);
    if (localProject?.description) parts.push(localProject.description.slice(0, 200));
    if (localFeature?.name)        parts.push("\nFEATURE: " + localFeature.name);
    if (localFeature?.description) parts.push(localFeature.description.slice(0, 200));
    if (fo.prd) {
      const prd = typeof fo.prd === "string" ? fo.prd : JSON.stringify(fo.prd);
      parts.push("\nPRD SUMMARY:\n" + prd.slice(0, 600));
    } else if (projectOutputs.decision_log) {
      const dl = typeof projectOutputs.decision_log === "string" ? projectOutputs.decision_log : JSON.stringify(projectOutputs.decision_log);
      parts.push("\nDECISION LOG:\n" + dl.slice(0, 400));
    }
    return parts.join("\n").trim();
  };

  const [featureContext, setFeatureContext] = useState("");
  const [loadingIds,     setLoadingIds]     = useState([]);
  const [results,        setResults]        = useState({});
  const [error,          setError]          = useState(null);

  useEffect(() => {
    setFeatureContext(buildDefaultContext());
    setResults({});
  }, [localProject?.id, localFeature?.id]);

  const canGenerate = featureContext.trim().length > 0;

  const generateFor = async (stakeholder) => {
    if (!canGenerate) return;
    setLoadingIds(prev => [...prev, stakeholder.id]);
    setError(null);
    try {
      const prompt = `You are a product manager communicating to a specific stakeholder.\n\nCONTEXT:\n${featureContext}\n\nSTAKEHOLDER: ${stakeholder.label}\nTHEIR FOCUS: ${stakeholder.focus}\nFORMAT: ${stakeholder.format}\n\nWrite a clear, targeted message for this stakeholder. Focus only on what matters to them.\nDo not include a subject line or greeting — just the message body.\nKeep it concise and specific to their perspective.`;
      const res  = await apiFetch("/enhance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 1000 }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(prev => ({ ...prev, [stakeholder.id]: data.result }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingIds(prev => prev.filter(id => id !== stakeholder.id));
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 320, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", padding: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2a", marginBottom: 4 }}>Stakeholder Translator</div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginBottom: 14 }}>Context is pre-loaded from your selected project and feature. Edit as needed, then generate targeted messages per stakeholder.</div>
        <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Context</div>
        <textarea value={featureContext} onChange={e => { setFeatureContext(e.target.value); setResults({}); }} placeholder="Describe the feature or update you want to communicate..." rows={14}
          style={{ width: "100%", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 14px", color: "#333", fontSize: 12, fontFamily: "inherit", lineHeight: 1.7, resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
        {error && <div style={{ padding: "10px 14px", background: "#FF444411", border: "1px solid #FF444433", borderRadius: 8, color: "#FF4444", fontSize: 12, marginBottom: 10 }}>❌ {error}</div>}
        {canGenerate ? <div style={{ fontSize: 12, color: "#00AA44", fontWeight: 600 }}>✓ Ready — click Generate on any card</div> : <div style={{ fontSize: 12, color: "#bbb" }}>Select a project above or paste context here</div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f5f6f8" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a", marginBottom: 2 }}>Stakeholder Messages</div>
          <div style={{ fontSize: 12, color: "#888" }}>{Object.keys(results).length > 0 ? `${Object.keys(results).length} generated · click any card to expand` : "Generate a tailored message for each stakeholder"}</div>
        </div>
        {STAKEHOLDERS.map(s => <StakeholderCard key={s.id} stakeholder={s} content={results[s.id] || null} loading={loadingIds.includes(s.id)} canGenerate={canGenerate} onGenerate={() => generateFor(s)} />)}
      </div>
    </div>
  );
}

// ── Root with tabs ────────────────────────────────────────────────────────────

const ASSISTANT_TABS = [
  { id: "chat",        label: "🧠 Chat" },
  { id: "stakeholder", label: "🔀 Stakeholder" },
];

export default function PMChat({ ps }) {
  const { activeProject, activeFeature, projectOutputs, featureOutputs } = ps;

  const [activeTab,    setActiveTab]    = useState("chat");
  const [localProject, setLocalProject] = useState(activeProject);
  const [localFeature, setLocalFeature] = useState(activeFeature);

  useEffect(() => { if (activeProject && !localProject) setLocalProject(activeProject); }, [activeProject]);
  useEffect(() => { if (activeFeature && !localFeature) setLocalFeature(activeFeature); }, [activeFeature]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", flexShrink: 0 }}>
        <div style={{ padding: "0 18px", display: "flex", alignItems: "center", gap: 4, height: 44, borderBottom: "1px solid #f0f0f0" }}>
          {ASSISTANT_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "5px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: activeTab === tab.id ? "#1a1a2a" : "transparent", color: activeTab === tab.id ? "#fff" : "#666", border: "none", fontWeight: activeTab === tab.id ? 600 : 400, transition: "all 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>
        <ContextSelector ps={ps} selectedProject={localProject} selectedFeature={localFeature} onProjectChange={setLocalProject} onFeatureChange={setLocalFeature} />
      </div>
      {activeTab === "chat"        && <ChatTab ps={ps} localProject={localProject} localFeature={localFeature} />}
      {activeTab === "stakeholder" && <StakeholderTab localProject={localProject} localFeature={localFeature} projectOutputs={projectOutputs} featureOutputs={featureOutputs} />}
    </div>
  );
}