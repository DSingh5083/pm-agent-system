// src/modules/Features/index.jsx
// Dedicated Features tab — feature description + all feature stages + Comms tab.
// Comms tab contains the Stakeholder Translator (moved from Writing module).

import { useState } from "react";
import StageCard, { SectionHeader } from "../PMPipeline/StageCard/index.jsx";
import CodeReadyStories from "./CodeReadyStories.jsx";
import CodeReadyPRD     from "./CodeReadyPRD.jsx";
import { FEATURE_STAGES } from "../PMPipeline/constants.js";
import { apiFetch }       from "../../lib/apiClient.js";

// ── Stakeholder Translator (moved from WritingEnhancer) ───────────────────────

const STAKEHOLDERS = [
  { id: "ceo",         label: "CEO",              icon: "👔", color: "#0066FF", focus: "Business impact, revenue, market opportunity, ROI and strategic value",                                format: "Executive summary — lead with business outcome, under 150 words, no technical jargon" },
  { id: "tech-lead",   label: "Tech Lead",        icon: "🧑‍💻", color: "#8B00FF", focus: "Technical architecture, scalability, implementation, tech debt, engineering trade-offs",           format: "Technical and direct — include architecture considerations, risks, and suggested approach" },
  { id: "ba",          label: "Business Analyst", icon: "📋", color: "#00AA44", focus: "Business cases, edge cases, functional requirements, acceptance criteria, user flows",               format: "Detailed and structured — list all cases, flows, and scenarios with numbered points" },
  { id: "qa",          label: "QA Engineer",      icon: "🔬", color: "#FF8800", focus: "Test scenarios, edge cases, regression risks, acceptance criteria, what could break",                format: "Structured test thinking — list test cases, happy path, negative cases, edge scenarios" },
  { id: "designer",    label: "Designer",         icon: "🎨", color: "#FF4444", focus: "User experience, UI requirements, user journey, interaction patterns, accessibility",                format: "UX-focused — describe user journey, key screens, interactions and design constraints" },
  { id: "stakeholder", label: "Stakeholder",      icon: "🤝", color: "#555",    focus: "Project status, timeline, risks, dependencies and what decisions are needed from them",              format: "Clear update style — what is happening, why it matters, and what you need from them" },
];

function StakeholderTranslator({ activeFeature, currentFeatureOutputs }) {
  // Pre-populate with PRD content if available, else feature description
  const prd     = currentFeatureOutputs?.prd;
  const prefill = typeof prd === "string" ? prd.slice(0, 800) :
                  activeFeature?.description || "";

  const [featureContext, setFeatureContext] = useState(prefill);
  const [loadingIds,     setLoadingIds]     = useState([]);
  const [results,        setResults]        = useState({});
  const [error,          setError]          = useState(null);

  const canGenerate = featureContext.trim().length > 0;

  const generateFor = async (stakeholder) => {
    if (!canGenerate) return;
    setLoadingIds(prev => [...prev, stakeholder.id]);
    setError(null);
    try {
      const prompt = `You are a product manager communicating a feature to a specific stakeholder.

FEATURE / CONTEXT:
${featureContext}

STAKEHOLDER: ${stakeholder.label}
THEIR FOCUS: ${stakeholder.focus}
FORMAT: ${stakeholder.format}

Write a clear, targeted message for this stakeholder. Focus only on what matters to them.
Do not include a subject line or greeting — just the message body.
Keep it concise and specific to their perspective.`;

      const res  = await apiFetch("/enhance-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 1500 }),
      });
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
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: input */}
      <div style={{ width: 340, background: "#fff", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", padding: 24, flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2a", marginBottom: 4 }}>Stakeholder Comms</div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginBottom: 16 }}>
          Context is pre-loaded from this feature's PRD. Edit as needed, then generate targeted messages per stakeholder.
        </div>
        <textarea
          value={featureContext}
          onChange={e => { setFeatureContext(e.target.value); setResults({}); }}
          placeholder="Describe the feature or paste PRD content here..."
          rows={14}
          style={{ width: "100%", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 14px", color: "#333", fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />
        {error && (
          <div style={{ padding: "10px 14px", background: "#FF444411", border: "1px solid #FF444433", borderRadius: 8, color: "#FF4444", fontSize: 12 }}>
            ❌ {error}
          </div>
        )}
        {canGenerate
          ? <div style={{ fontSize: 12, color: "#00AA44", fontWeight: 600 }}>✓ Ready — click Generate on any card</div>
          : <div style={{ fontSize: 12, color: "#bbb" }}>Enter feature context to unlock Generate buttons</div>
        }
      </div>

      {/* Right: stakeholder cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f5f6f8" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a", marginBottom: 2 }}>Stakeholder Messages</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {Object.keys(results).length > 0
              ? `${Object.keys(results).length} generated · click any card to expand`
              : "Generate messages one stakeholder at a time"}
          </div>
        </div>

        {STAKEHOLDERS.map(s => {
          const content   = results[s.id] || null;
          const isLoading = loadingIds.includes(s.id);
          const [expanded, setExpanded] = [false, () => {}]; // local state via key trick
          return (
            <StakeholderCard
              key={s.id}
              stakeholder={s}
              content={content}
              loading={isLoading}
              canGenerate={canGenerate}
              onGenerate={() => generateFor(s)}
            />
          );
        })}
      </div>
    </div>
  );
}

function StakeholderCard({ stakeholder, content, loading, canGenerate, onGenerate }) {
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = () => { if (content) navigator.clipboard.writeText(content); };

  return (
    <div style={{ background: "#fff", border: `1px solid ${stakeholder.color}22`, borderRadius: 12, overflow: "hidden", marginBottom: 12, borderLeft: `4px solid ${stakeholder.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: `${stakeholder.color}06`, borderBottom: (content || loading) ? `1px solid ${stakeholder.color}11` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${stakeholder.color}15`, border: `1.5px solid ${stakeholder.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
            {stakeholder.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>{stakeholder.label}</div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{stakeholder.focus.split(",")[0].trim()}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <span style={{ fontSize: 11, color: stakeholder.color, fontFamily: "monospace" }}>generating...</span>}
          {content && !loading && (
            <>
              <button onClick={copyToClipboard} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#888", border: "1px solid #e0e0e0", cursor: "pointer" }}>Copy</button>
              <button onClick={onGenerate} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "transparent", color: stakeholder.color, border: `1px solid ${stakeholder.color}44`, cursor: "pointer", fontWeight: 600 }}>↺ Redo</button>
              <button onClick={() => setExpanded(!expanded)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}>
                {expanded ? "▲" : "▼"}
              </button>
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
      {content && expanded && (
        <div style={{ padding: "16px 18px", fontSize: 13, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "#fafafa" }}>
          {content}
        </div>
      )}
      {content && !expanded && (
        <div style={{ padding: "10px 16px", fontSize: 12, color: "#888", cursor: "pointer" }} onClick={() => setExpanded(true)}>
          {content.slice(0, 140)}... <span style={{ color: stakeholder.color, fontWeight: 600 }}>Read more</span>
        </div>
      )}
      {!content && !loading && (
        <div style={{ padding: "8px 16px", fontSize: 11, color: "#ccc", fontStyle: "italic" }}>
          {canGenerate ? "Click Generate to create this message" : "Enter feature context to unlock"}
        </div>
      )}
    </div>
  );
}

// ── Feature description input ─────────────────────────────────────────────────

function FeatureDescription({ value, onSave }) {
  const [saving,    setSaving]    = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const save = async (val) => {
    setSaving(true);
    await onSave(val);
    setSaving(false);
    setLastSaved(new Date());
  };

  return (
    <div style={{ marginBottom: 20, background: "#fff", border: "1.5px solid #00AA4422", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: "#00AA4406", borderBottom: "1px solid #00AA4410", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 8 }}>
          Feature Context <span style={{ color: "#FF4444", fontSize: 10 }}>*</span>
        </div>
        <div style={{ fontSize: 11, color: "#bbb", fontFamily: "monospace" }}>
          {saving ? "saving..." : lastSaved ? "saved ✓" : "auto-saves on blur"}
        </div>
      </div>
      <textarea
        key={value}
        defaultValue={value || ""}
        onBlur={e => save(e.target.value)}
        placeholder="What is this feature? Who uses it, what problem does it solve, what is explicitly out of scope? Add any technical constraints or design decisions already made."
        rows={4}
        style={{ width: "100%", padding: "14px 16px", fontSize: 13, fontFamily: "inherit", color: "#1a1a2a", lineHeight: 1.8, border: "none", outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fff" }}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ activeProject, onGoToPipeline }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, background: "#f5f6f8", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>⚙️</div>
      {!activeProject ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#aaa" }}>No project selected</div>
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>Select or create a project first, then add features to it.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#aaa" }}>No feature selected</div>
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>
            Select a feature from the sidebar, or add one under <strong style={{ color: "#aaa" }}>{activeProject.name}</strong>.
          </div>
          <button onClick={onGoToPipeline}
            style={{ marginTop: 8, padding: "8px 20px", background: "#0066FF", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ← Back to Project Pipeline
          </button>
        </>
      )}
    </div>
  );
}

// ── Feature tabs ──────────────────────────────────────────────────────────────

const FEATURE_TABS = [
  { id: "spec",  label: "📋 Spec",  desc: "PRD, architecture, flows, tickets" },
  { id: "comms", label: "📢 Comms", desc: "Stakeholder messages" },
];

// ── Main module ───────────────────────────────────────────────────────────────

export default function Features({ ps, onGoToPipeline }) {
  const {
    activeProject,
    activeFeature,
    featureOutputs,
    projectOutputs,
    constraints,
    updateFeature,
    saveFeatureOutput,
  } = ps;

  const [activeTab, setActiveTab] = useState("spec");

  if (!activeProject || !activeFeature) {
    return <EmptyState activeProject={activeProject} onGoToPipeline={onGoToPipeline} />;
  }

  const currentFeatureOutputs = featureOutputs[activeFeature.id] || {};
  const featureStageCount     = Object.keys(currentFeatureOutputs).length;
  const projectStageCount     = Object.keys(projectOutputs).length;
  const featureDescMissing    = !activeFeature.description?.trim();
  const constraintsMust       = constraints.filter(c => c.severity === "Must").length;
  const constraintsShould     = constraints.filter(c => c.severity === "Should").length;

  return (
    <div style={{ height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8", display: "flex", flexDirection: "column" }}>

      {/* Feature sub-tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 32px", display: "flex", alignItems: "center", gap: 4, height: 44, flexShrink: 0 }}>
        {FEATURE_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "5px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: activeTab === tab.id ? "#1a1a2a" : "transparent", color: activeTab === tab.id ? "#fff" : "#666", border: "none", fontWeight: activeTab === tab.id ? 600 : 400, transition: "all 0.15s" }}>
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>
          {activeFeature.name} · {featureStageCount} stages done
        </div>
      </div>

      {/* Spec tab */}
      {activeTab === "spec" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

          {/* Project context bar */}
          <div style={{ marginBottom: 20, padding: "10px 16px", background: "#fff", border: "1px solid #0066FF18", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onGoToPipeline}
              style={{ padding: "4px 12px", background: "#0066FF0d", border: "1px solid #0066FF22", borderRadius: 20, color: "#0066FF", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
              ← Pipeline
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", flexShrink: 0 }}>📁 {activeProject.name}</span>
            <span style={{ fontSize: 12, color: "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeProject.description?.replace(/[#*`]/g, "").trim().slice(0, 100) || "No brief yet"}
            </span>
            {projectStageCount > 0 && (
              <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", flexShrink: 0 }}>{projectStageCount} strategy stages done</span>
            )}
          </div>

          <SectionHeader
            icon="⚙️"
            title={activeFeature.name + " — Feature Spec"}
            subtitle="All project constraints are automatically applied to every stage below."
            color="#00AA44"
            count={featureStageCount}
          />

          <FeatureDescription
            key={activeFeature.id}
            value={activeFeature.description}
            onSave={(desc) => updateFeature(activeFeature.id, activeFeature.name, desc)}
          />

          {constraints.length > 0 && (
            <div style={{ marginBottom: 16, padding: "9px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#888", display: "flex", gap: 8, alignItems: "center" }}>
              <span>🔒</span>
              <span>
                {constraints.length} project constraint{constraints.length > 1 ? "s" : ""} active —{" "}
                <strong style={{ color: "#FF8800" }}>{constraintsMust} Must, {constraintsShould} Should</strong>. All stages will respect these.
              </span>
            </div>
          )}

          {/* Feature stages — paths only, no API prefix */}
          {FEATURE_STAGES.map(stage => (
            <div key={activeFeature.id + "-" + stage.id}>
              <StageCard
                stage={stage}
                result={currentFeatureOutputs[stage.id] !== undefined ? currentFeatureOutputs[stage.id] : null}
                loading={false}
                descriptionMissing={featureDescMissing}
                interviewEndpoint={"/features/" + activeFeature.id + "/interview/" + stage.id}
                runEndpoint={"/features/" + activeFeature.id + "/run/" + stage.id}
                onResult={(result) => saveFeatureOutput(activeFeature.id, stage.id, result)}
                projectName={activeProject.name}
                featureName={activeFeature.name}
              />
              {stage.id === "prd" && (
                <>
                  <CodeReadyPRD
                    key={activeFeature.id + "-code-prd"}
                    featureId={activeFeature.id}
                    featureName={activeFeature.name}
                    hasPrd={!!currentFeatureOutputs["prd"]}
                    initialContent={currentFeatureOutputs["code_ready_prd"] || null}
                    onSaved={(c) => saveFeatureOutput(activeFeature.id, "code_ready_prd", c)}
                  />
                  <CodeReadyStories
                    key={activeFeature.id + "-stories"}
                    featureId={activeFeature.id}
                    featureName={activeFeature.name}
                    hasPrd={!!currentFeatureOutputs["prd"]}
                    initialStories={
                      currentFeatureOutputs["code_stories"]
                        ? (typeof currentFeatureOutputs["code_stories"] === "string"
                            ? JSON.parse(currentFeatureOutputs["code_stories"])
                            : currentFeatureOutputs["code_stories"])
                        : null
                    }
                    onStoriesSaved={(stories) => saveFeatureOutput(activeFeature.id, "code_stories", stories)}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comms tab */}
      {activeTab === "comms" && (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <StakeholderTranslator
            activeFeature={activeFeature}
            currentFeatureOutputs={currentFeatureOutputs}
          />
        </div>
      )}
    </div>
  );
}