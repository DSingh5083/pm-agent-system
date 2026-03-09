// ─────────────────────────────────────────────────────────────────────────────
// modules/PMPipeline/index.jsx — project-aware, auto-saves every stage
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { callBackend } from "../../lib/claude.js";
import { CopyButton, Card } from "../../components/ui.jsx";

const STAGES = [
  { id: "Competitor",   icon: "🌐", label: "Competitor Intel",      color: "#FF8800", description: "Live web search · market gaps · competitor analysis", endpoint: "/competitor", resultKey: "result" },
  { id: "PRD",          icon: "📄", label: "PRD",                   color: "#0066FF", description: "Full product requirements document",                   endpoint: "/run",        resultKey: "prd" },
  { id: "Architecture", icon: "🏗️", label: "Technical Architecture", color: "#0099AA", description: "Components · data models · API design · tech stack",  endpoint: "/architecture", resultKey: "result" },
  { id: "Flow",         icon: "🔀", label: "High Level Flow",        color: "#AA00AA", description: "Happy path · edge cases · state transitions",          endpoint: "/flow",       resultKey: "result" },
  { id: "Review",       icon: "🔍", label: "Spec Review",            color: "#FF4444", description: "Gap analysis · risks · ambiguities",                   endpoint: "/run",        resultKey: "reviewNotes" },
  { id: "Tickets",      icon: "🎫", label: "Tickets",                color: "#00AA44", description: "Jira-ready dev tickets with acceptance criteria",       endpoint: "/run",        resultKey: "tickets" },
  { id: "Roadmap",      icon: "🗺️", label: "Roadmap",               color: "#8B00FF", description: "Sprint-by-sprint plan with milestones",                endpoint: "/run",        resultKey: "roadmap" },
];

function TicketCard({ ticket }) {
  const typeColor = { feature: "#0066FF", bug: "#FF4444", chore: "#888" };
  const color = typeColor[ticket.type] || "#888";
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: 16, marginBottom: 12, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2a", flex: 1, marginRight: 12 }}>{ticket.title}</div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${color}11`, color, border: `1px solid ${color}33`, textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}>{ticket.type}</span>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "#00AA4411", color: "#00AA44", border: "1px solid #00AA4433", fontFamily: "monospace", fontWeight: 600 }}>{ticket.storyPoints}pt</span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: ticket.acceptanceCriteria ? 10 : 0 }}>{ticket.description}</div>
      {ticket.acceptanceCriteria && (
        <div style={{ borderTop: "1px solid #f0f2f5", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "monospace" }}>Acceptance Criteria</div>
          {ticket.acceptanceCriteria.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: "#555", display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#00AA44", flexShrink: 0, fontWeight: 700 }}>✓</span><span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionedContent({ content, accentColor }) {
  const sections = content.split(/\n##\s+/).filter(Boolean);
  if (sections.length <= 1) {
    return <pre style={{ fontSize: 14, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", margin: 0 }}>{content}</pre>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {sections.map((section, i) => {
        const nl = section.indexOf("\n");
        const title = (i === 0 ? section : section.slice(0, nl)).trim();
        const body = i === 0 ? "" : section.slice(nl + 1).trim();
        if (!body) return null;
        return (
          <div key={i} style={{ background: "#fff", border: `1px solid ${accentColor}22`, borderRadius: 10, overflow: "hidden", borderLeft: `4px solid ${accentColor}` }}>
            <div style={{ padding: "10px 16px", background: `${accentColor}06`, borderBottom: `1px solid ${accentColor}11` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{title}</div>
            </div>
            <div style={{ padding: "14px 16px", fontSize: 14, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{body}</div>
          </div>
        );
      })}
    </div>
  );
}

function StageContent({ stage, result }) {
  if (stage.id === "Tickets" && Array.isArray(result)) {
    const totalPoints = result.reduce((s, t) => s + t.storyPoints, 0);
    return (
      <>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Tickets",      value: result.length,                                   color: "#0066FF" },
            { label: "Story Points", value: totalPoints,                                     color: "#8B00FF" },
            { label: "Features",     value: result.filter(t => t.type === "feature").length, color: "#00AA44" },
            { label: "Chores",       value: result.filter(t => t.type === "chore").length,   color: "#888"   },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 18px", minWidth: 100 }}>
              <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
        {result.map((t, i) => <TicketCard key={i} ticket={t} />)}
      </>
    );
  }
  if (typeof result === "string") {
    return <SectionedContent content={result} accentColor={stage.color} />;
  }
  return null;
}

function StagePanel({ stage, result, loading, canRun, onRun, saved }) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = result !== null && result !== undefined;
  const totalPoints = stage.id === "Tickets" && Array.isArray(result) ? result.reduce((s, t) => s + t.storyPoints, 0) : 0;

  return (
    <div style={{ background: "#fff", border: `1px solid ${stage.color}22`, borderRadius: 14, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderLeft: `4px solid ${stage.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: `${stage.color}06`, borderBottom: hasResult || loading ? `1px solid ${stage.color}11` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${stage.color}15`, border: `1.5px solid ${stage.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{stage.icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 8 }}>
              {stage.label}
              {stage.id === "Competitor" && <span style={{ fontSize: 10, color: "#FF8800", background: "#FF880011", padding: "2px 7px", borderRadius: 10, border: "1px solid #FF880033", fontWeight: 600 }}>🌐 Live</span>}
              {saved && <span style={{ fontSize: 10, color: "#00AA44", fontFamily: "monospace" }}>✓ saved</span>}
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{stage.description}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <div style={{ fontSize: 12, color: stage.color, fontFamily: "monospace" }}>{stage.id === "Competitor" ? "searching web..." : "generating..."}</div>}
          {hasResult && !loading && (
            <>
              {stage.id === "Tickets" && <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{result.length} tickets · {totalPoints}pts</span>}
              <CopyButton getText={() => stage.id === "Tickets" ? JSON.stringify(result, null, 2) : result} />
              <button onClick={onRun} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, background: "transparent", color: stage.color, border: `1px solid ${stage.color}44`, cursor: "pointer", fontWeight: 600 }}>↺ Redo</button>
              <button onClick={() => setExpanded(!expanded)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, background: "#f5f6f8", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}>{expanded ? "▲ Collapse" : "▼ Expand"}</button>
            </>
          )}
          {!hasResult && !loading && (
            <button onClick={onRun} disabled={!canRun} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: canRun ? `linear-gradient(135deg, ${stage.color}dd, ${stage.color})` : "#e8e8e8", color: canRun ? "#fff" : "#aaa", border: "none", cursor: canRun ? "pointer" : "not-allowed", boxShadow: canRun ? `0 2px 10px ${stage.color}33` : "none", transition: "all 0.15s" }}>
              Run ↗
            </button>
          )}
        </div>
      </div>

      {hasResult && expanded && (
        <div style={{ padding: "20px 24px", background: "#fafafa" }}>
          <StageContent stage={stage} result={result} />
        </div>
      )}
      {hasResult && !expanded && (
        <div onClick={() => setExpanded(true)} style={{ padding: "12px 20px", fontSize: 13, color: "#999", lineHeight: 1.6, cursor: "pointer" }}>
          {stage.id === "Tickets" ? `${result.length} tickets generated` : typeof result === "string" ? result.slice(0, 160) + "..." : ""}
          <span style={{ color: stage.color, marginLeft: 8, fontWeight: 600 }}>Expand ↓</span>
        </div>
      )}
      {!hasResult && !loading && (
        <div style={{ padding: "12px 20px", fontSize: 12, color: "#ccc", fontStyle: "italic" }}>
          {canRun ? `Click Run to generate ${stage.label}` : "Enter your feature idea above to unlock"}
        </div>
      )}
    </div>
  );
}

export default function PMPipeline({ projectState }) {
  const { activeProject, pipelineResults, savePipelineStage, updateProject } = projectState;

  // Local idea state — synced from active project
  const [idea, setIdea]             = useState("");
  const [loadingIds, setLoadingIds] = useState([]);
  const [error, setError]           = useState(null);

  // When project changes, load its idea
  useEffect(() => {
    setIdea(activeProject?.idea || "");
  }, [activeProject?.id]);

  const canRun = idea.trim().length > 0;

  const handleIdeaChange = (val) => {
    setIdea(val);
  };

  const handleIdeaBlur = async () => {
    if (activeProject && idea !== activeProject.idea) {
      await updateProject(activeProject.id, activeProject.name, idea);
    }
  };

  const runStage = async (stage) => {
    if (!canRun) return;
    // Save idea to project before running
    if (activeProject) await updateProject(activeProject.id, activeProject.name, idea);

    setLoadingIds(prev => [...prev, stage.id]);
    setError(null);
    try {
      const data = await callBackend(stage.endpoint, { idea });
      const result = data[stage.resultKey];
      if (activeProject) await savePipelineStage(stage.id, result);
      else {
        // No project — still show result locally via projectState won't help,
        // but savePipelineStage handles the state update internally
      }
    } catch (e) {
      setError(`${stage.label}: ${e.message}`);
    } finally {
      setLoadingIds(prev => prev.filter(id => id !== stage.id));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      {/* Input bar */}
      <div style={{ background: "linear-gradient(135deg, #0066FF08, #FF880008)", borderBottom: "1px solid #e8e8e8", padding: "20px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2a", margin: 0 }}>PM Pipeline</h1>
          {!activeProject && <span style={{ fontSize: 11, color: "#FF8800", background: "#FF880011", padding: "2px 8px", borderRadius: 10, border: "1px solid #FF880033" }}>⚠️ No project selected — results won't be saved</span>}
        </div>
        <textarea
          value={idea}
          onChange={e => handleIdeaChange(e.target.value)}
          onBlur={handleIdeaBlur}
          placeholder="Describe your feature... (auto-saved to project when you run a stage)"
          rows={2}
          style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: "11px 14px", color: "#1a1a2a", fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, resize: "none", outline: "none", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", boxSizing: "border-box" }}
        />
        {error && <div style={{ marginTop: 8, padding: "8px 12px", background: "#FF444411", border: "1px solid #FF444433", borderRadius: 8, color: "#FF4444", fontSize: 13 }}>❌ {error}</div>}
        <div style={{ marginTop: 8, fontSize: 12, color: canRun ? "#00AA44" : "#bbb", fontWeight: canRun ? 600 : 400 }}>
          {canRun ? "✓ Ready — click Run on any stage" : "Enter your feature above to unlock"}
        </div>
      </div>

      {/* Stages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#f5f6f8" }}>
        {STAGES.map(stage => (
          <StagePanel
            key={stage.id}
            stage={stage}
            result={pipelineResults[stage.id] !== undefined ? pipelineResults[stage.id] : null}
            loading={loadingIds.includes(stage.id)}
            canRun={canRun}
            saved={!!activeProject && pipelineResults[stage.id] !== undefined}
            onRun={() => runStage(stage)}
          />
        ))}
      </div>
    </div>
  );
}