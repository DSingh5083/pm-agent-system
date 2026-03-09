// ─────────────────────────────────────────────────────────────────────────────
// modules/PMPipeline/index.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { callBackend } from "../../lib/claude.js";
import { ErrorBanner, CopyButton, EmptyState, Card } from "../../components/ui.jsx";

const STAGES = ["PRD", "Review", "Tickets", "Roadmap"];
const STAGE_CONFIG = {
  PRD:     { icon: "📄", label: "PRD Writer",    color: "#0066FF" },
  Review:  { icon: "🔍", label: "Spec Reviewer", color: "#FF4444" },
  Tickets: { icon: "🎫", label: "Ticket Writer", color: "#00AA44" },
  Roadmap: { icon: "🗺️", label: "Roadmap Plan",  color: "#8B00FF" },
};

function TicketCard({ ticket }) {
  const typeColor = { feature: "#0066FF", bug: "#FF4444", chore: "#888" };
  return (
    <Card accent={typeColor[ticket.type]} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2a", flex: 1, marginRight: 12 }}>{ticket.title}</div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${typeColor[ticket.type]}11`, color: typeColor[ticket.type], border: `1px solid ${typeColor[ticket.type]}33`, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}>{ticket.type}</span>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "#00AA4411", color: "#00AA44", border: "1px solid #00AA4433", fontFamily: "monospace", fontWeight: 600 }}>{ticket.storyPoints}pt</span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: ticket.acceptanceCriteria ? 10 : 0 }}>{ticket.description}</div>
      {ticket.acceptanceCriteria && (
        <div style={{ borderTop: "1px solid #f0f2f5", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "monospace" }}>Acceptance Criteria</div>
          {ticket.acceptanceCriteria.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: "#555", display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#00AA44", flexShrink: 0, fontWeight: 700 }}>✓</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StageButton({ stage, isDone, isActive, isRunning, meta, onClick }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <button onClick={onClick} disabled={!isDone} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 4, border: "none", cursor: isDone ? "pointer" : "default", background: isActive ? `${cfg.color}12` : "transparent", borderLeft: isActive ? `3px solid ${cfg.color}` : "3px solid transparent", transition: "all 0.15s", textAlign: "left" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: isDone ? `${cfg.color}15` : isRunning ? `${cfg.color}10` : "#f5f6f8", border: `1.5px solid ${isDone || isRunning ? cfg.color : "#e8e8e8"}`, color: isDone ? cfg.color : "#aaa" }}>
        {isDone ? "✓" : isRunning ? "⟳" : cfg.icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isDone ? (isActive ? cfg.color : "#333") : "#bbb" }}>{cfg.label}</div>
        {isRunning && <div style={{ fontSize: 11, color: cfg.color, fontFamily: "monospace" }}>generating...</div>}
        {meta && <div style={{ fontSize: 11, color: "#aaa" }}>{meta}</div>}
      </div>
    </button>
  );
}

export default function PMPipeline() {
  const [idea, setIdea]                 = useState("");
  const [running, setRunning]           = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [results, setResults]           = useState({});
  const [activeTab, setActiveTab]       = useState(null);
  const [error, setError]               = useState(null);
  const [submitted, setSubmitted]       = useState(false);

  const doneStages = Object.keys(results);
  const totalPoints = results.Tickets ? results.Tickets.reduce((s, t) => s + t.storyPoints, 0) : 0;

  const runPipeline = async () => {
    if (!idea.trim()) return;
    setRunning(true); setResults({}); setError(null); setActiveTab(null); setSubmitted(true);
    try {
      setCurrentStage("PRD");
      const data = await callBackend("/run", { idea });
      setResults({ PRD: data.prd }); setActiveTab("PRD");
      setCurrentStage("Review"); await new Promise(r => setTimeout(r, 300));
      setResults(r => ({ ...r, Review: data.reviewNotes }));
      setCurrentStage("Tickets"); await new Promise(r => setTimeout(r, 300));
      setResults(r => ({ ...r, Tickets: data.tickets }));
      setCurrentStage("Roadmap"); await new Promise(r => setTimeout(r, 300));
      setResults(r => ({ ...r, Roadmap: data.roadmap }));
      setCurrentStage(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false); setCurrentStage(null);
    }
  };

  const renderContent = () => {
    if (!activeTab) return null;
    if (activeTab === "Tickets" && results.Tickets) {
      return (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Tickets",      value: results.Tickets.length, color: "#0066FF" },
              { label: "Story Points", value: totalPoints,             color: "#8B00FF" },
              { label: "Features",     value: results.Tickets.filter(t => t.type === "feature").length, color: "#00AA44" },
              { label: "Chores",       value: results.Tickets.filter(t => t.type === "chore").length,   color: "#888" },
            ].map(({ label, value, color }) => (
              <Card key={label} style={{ padding: "14px 20px", minWidth: 110 }}>
                <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
              </Card>
            ))}
          </div>
          {results.Tickets.map((t, i) => <TicketCard key={i} ticket={t} />)}
        </>
      );
    }
    const content = results[activeTab];
    if (!content) return null;
    return <pre style={{ fontSize: 14, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", margin: 0, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>{content}</pre>;
  };

  const CONTENT_TITLES = { PRD: "Product Requirements Document", Review: "Spec Review & Gap Analysis", Tickets: "Development Tickets", Roadmap: "Sprint Roadmap Plan" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>

      {/* Input bar */}
      <div style={{ background: "linear-gradient(135deg, #0066FF08 0%, #8B00FF08 100%)", borderBottom: "1px solid #e8e8e8", padding: "24px 40px", flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2a", marginBottom: 4 }}>Ship Features Faster</h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 14 }}>Describe your feature → PRD, spec review, tickets and roadmap instantly.</p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="e.g. Add a checkout flow with price, delivery date, service type, add-ons..." rows={2} style={{ flex: 1, background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: "12px 16px", color: "#1a1a2a", fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, resize: "none", outline: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
          <button onClick={runPipeline} disabled={running || !idea.trim()} style={{ padding: "12px 28px", flexShrink: 0, alignSelf: "stretch", background: running || !idea.trim() ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)", border: "none", borderRadius: 10, color: running || !idea.trim() ? "#aaa" : "#fff", fontSize: 14, fontWeight: 700, cursor: running || !idea.trim() ? "not-allowed" : "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {running ? "Running..." : "▶ Run Pipeline"}
          </button>
        </div>
        <ErrorBanner message={error} />
      </div>

      {submitted ? (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{ width: 220, background: "#fff", borderRight: "1px solid #e8e8e8", padding: "20px 12px", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "#bbb", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, paddingLeft: 8 }}>Outputs</div>
            {STAGES.map(stage => (
              <StageButton key={stage} stage={stage} isDone={doneStages.includes(stage)} isActive={activeTab === stage} isRunning={currentStage === stage} meta={stage === "Tickets" && results.Tickets ? `${results.Tickets.length} tickets · ${totalPoints}pts` : null} onClick={() => doneStages.includes(stage) && setActiveTab(stage)} />
            ))}
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px", background: "#f5f6f8" }}>
            {!activeTab ? (
              <EmptyState icon="⏳" title="Running pipeline..." loading={running} />
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{STAGE_CONFIG[activeTab].icon} {STAGE_CONFIG[activeTab].label}</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2a" }}>{CONTENT_TITLES[activeTab]}</h2>
                  </div>
                  <CopyButton getText={() => activeTab === "Tickets" ? JSON.stringify(results.Tickets, null, 2) : results[activeTab]} />
                </div>
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 52 }}>🚀</div>
          <div style={{ fontSize: 15, color: "#bbb" }}>Enter a feature idea above to get started</div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {STAGES.map(s => (
              <div key={s} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, background: "#fff", border: "1px solid #e8e8e8", color: "#aaa", fontFamily: "monospace" }}>
                {STAGE_CONFIG[s].icon} {STAGE_CONFIG[s].label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
