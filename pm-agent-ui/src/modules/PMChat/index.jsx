// ─────────────────────────────────────────────────────────────────────────────
// modules/PMChat/index.jsx — project-aware chat with auto-loaded pipeline context
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { callBackend } from "../../lib/claude.js";

const STARTERS = [
  { icon: "📄", label: "Refine my PRD",             prompt: "Review my PRD and tell me what's missing, unclear, or needs strengthening. Be specific." },
  { icon: "🎯", label: "Sharpen problem statement",  prompt: "Help me write a sharp, clear problem statement based on my project context." },
  { icon: "✉️", label: "Draft stakeholder update",   prompt: "Draft a stakeholder update email based on my project context. Ask me who the audience is first." },
  { icon: "⚠️", label: "Identify risks",             prompt: "What are the top 3-5 risks with this feature I should flag to the team?" },
  { icon: "🔢", label: "Prioritise with RICE",       prompt: "Help me score this feature using the RICE framework. Ask me the inputs you need." },
  { icon: "❓", label: "Discovery questions",        prompt: "What discovery questions should I be asking before writing the PRD for this?" },
  { icon: "✅", label: "Write acceptance criteria",  prompt: "Write detailed acceptance criteria for the feature in my project context." },
  { icon: "🔄", label: "Retro summary",              prompt: "Help me write a retro summary. I'll paste the notes and you structure them into wins, issues, and actions." },
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16, alignItems: "flex-end", gap: 8 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>P</div>
      )}
      <div style={{ maxWidth: "72%", background: isUser ? "linear-gradient(135deg, #0066FF, #8B00FF)" : "#fff", color: isUser ? "#fff" : "#1a1a2a", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px", fontSize: 14, lineHeight: 1.7, boxShadow: isUser ? "0 2px 12px rgba(0,102,255,0.25)" : "0 1px 4px rgba(0,0,0,0.08)", border: isUser ? "none" : "1px solid #f0f0f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {message.content}
      </div>
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "#1a1a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>D</div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>P</div>
      <div style={{ background: "#fff", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#0066FF", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
        <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-6px);opacity:1} }`}</style>
      </div>
    </div>
  );
}

export default function PMChat({ projectState }) {
  const { activeProject, pipelineResults, chatMessages, clearChat, addChatMessage, setChatMessages } = projectState;

  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  // Count how many pipeline stages are loaded
  const loadedStages = Object.keys(pipelineResults).filter(k => pipelineResults[k]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput(""); setError(null);

    const newMsg = { role: "user", content: userText };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setLoading(true);

    try {
      const data = await callBackend("/chat", {
        messages: updatedMessages,
        projectId: activeProject?.id || null,
        pipelineContext: {
          idea: activeProject?.idea || "",
          ...pipelineResults,
        },
      });
      const assistantMsg = { role: "assistant", content: data.reply };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setError(e.message);
      setChatMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Make sure the backend is running." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isEmpty = chatMessages.length === 0;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>

      {/* Left: context status panel */}
      <div style={{ width: 260, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>Project Context</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Automatically loaded from pipeline</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {/* Project info */}
          {activeProject ? (
            <div style={{ padding: "10px 12px", background: "#0066FF08", border: "1px solid #0066FF22", borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", marginBottom: 4 }}>📁 {activeProject.name}</div>
              {activeProject.idea && (
                <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>
                  {activeProject.idea.slice(0, 120)}{activeProject.idea.length > 120 ? "..." : ""}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "10px 12px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#FF8800" }}>⚠️ No project selected. Chat history won't be saved.</div>
            </div>
          )}

          {/* Loaded stages */}
          <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Pipeline stages loaded
          </div>

          {["Competitor", "PRD", "Architecture", "Flow", "Review", "Tickets", "Roadmap"].map(stage => {
            const stageIcons = { Competitor: "🌐", PRD: "📄", Architecture: "🏗️", Flow: "🔀", Review: "🔍", Tickets: "🎫", Roadmap: "🗺️" };
            const hasData = pipelineResults[stage] !== undefined && pipelineResults[stage] !== null;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, marginBottom: 3, background: hasData ? "#00AA4408" : "transparent" }}>
                <span style={{ fontSize: 12 }}>{stageIcons[stage]}</span>
                <span style={{ fontSize: 12, color: hasData ? "#333" : "#ccc", flex: 1 }}>{stage}</span>
                {hasData
                  ? <span style={{ fontSize: 10, color: "#00AA44", fontWeight: 700 }}>✓</span>
                  : <span style={{ fontSize: 10, color: "#e0e0e0" }}>—</span>}
              </div>
            );
          })}

          {loadedStages.length === 0 && (
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 8, lineHeight: 1.6 }}>
              Run pipeline stages first — the assistant will automatically reference your PRD, tickets, roadmap etc.
            </div>
          )}

          {loadedStages.length > 0 && (
            <div style={{ marginTop: 12, padding: "8px 10px", background: "#00AA4408", border: "1px solid #00AA4422", borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: "#00AA44", fontWeight: 600 }}>
                ✓ {loadedStages.length} stage{loadedStages.length > 1 ? "s" : ""} in context
              </div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                The assistant knows your full project — ask anything specific.
              </div>
            </div>
          )}
        </div>

        {/* Clear chat */}
        {chatMessages.length > 0 && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid #f0f0f0" }}>
            <button
              onClick={async () => { await clearChat(); }}
              style={{ width: "100%", padding: "6px 0", background: "none", border: "1px solid #e8e8e8", borderRadius: 6, fontSize: 12, color: "#999", cursor: "pointer" }}
            >
              Clear chat history
            </button>
          </div>
        )}
      </div>

      {/* Right: chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #0066FF, #8B00FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 700 }}>P</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a" }}>PM Assistant</div>
            <div style={{ fontSize: 11, color: "#00AA44", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00AA44", display: "inline-block" }} />
              {activeProject ? `Working on: ${activeProject.name}` : "Online · no project selected"}
              {loadedStages.length > 0 && ` · ${loadedStages.length} stages loaded`}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {isEmpty && (
            <div style={{ maxWidth: 580, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🧠</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2a", marginBottom: 6 }}>
                  {activeProject ? `Let's work on ${activeProject.name}` : "PM Assistant"}
                </div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
                  {loadedStages.length > 0
                    ? `I have your ${loadedStages.join(", ")} loaded. Ask me anything specific about this project.`
                    : "Run some pipeline stages first so I have context, or just ask me anything."}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {STARTERS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    style={{ padding: "11px 13px", borderRadius: 10, textAlign: "left", background: "#fff", border: "1px solid #e8e8e8", cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                    onMouseOver={e => e.currentTarget.style.borderColor = "#0066FF55"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#e8e8e8"}
                  >
                    <div style={{ fontSize: 17, marginBottom: 3 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2a" }}>{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
          {loading && <TypingIndicator />}
          {error && <div style={{ textAlign: "center", fontSize: 12, color: "#FF4444", padding: 8 }}>❌ {error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "14px 20px", background: "#fff", borderTop: "1px solid #e8e8e8", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loadedStages.length > 0 ? "Ask about your PRD, stakeholder comms, risks, tickets... (Enter to send)" : "Ask anything about PM... (Enter to send)"}
              rows={2}
              style={{ flex: 1, background: "#f5f6f8", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "11px 14px", color: "#1a1a2a", fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, resize: "none", outline: "none", transition: "border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#0066FF"}
              onBlur={e => e.target.style.borderColor = "#e0e0e0"}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: loading || !input.trim() ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: loading || !input.trim() ? "#bbb" : "#fff", boxShadow: loading || !input.trim() ? "none" : "0 2px 10px rgba(0,102,255,0.3)", transition: "all 0.2s" }}
            >↑</button>
          </div>
          <div style={{ fontSize: 10, color: "#ccc", marginTop: 5, textAlign: "right" }}>Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  );
}