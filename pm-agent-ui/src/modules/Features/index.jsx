// src/modules/Features/index.jsx
// Dedicated Features tab — completely separate from Pipeline.
// Shows feature description + all feature stages.
// Has a "← Back to Pipeline" button to jump to project strategy.

import { useState } from "react";
import StageCard, { SectionHeader } from "../PMPipeline/StageCard/index.jsx";
import CodeReadyStories from "./CodeReadyStories.jsx";
import CodeReadyPRD     from "./CodeReadyPRD.jsx";
import { FEATURE_STAGES, API } from "../PMPipeline/constants.js";

const FEATURE_CONTEXT_KEY = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Feature description input ─────────────────────────────────────────────────

function FeatureDescription({ value, onSave }) {
  const [draft,     setDraft]     = useState(value || "");
  const [saving,    setSaving]    = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Sync when feature changes
  useState(() => { setDraft(value || ""); });

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
          Feature Context
          <span style={{ color: "#FF4444", fontSize: 10 }}>*</span>
        </div>
        <div style={{ fontSize: 11, color: "#bbb", fontFamily: "monospace" }}>
          {saving ? "saving..." : lastSaved ? "saved ✓" : "auto-saves as you type"}
        </div>
      </div>
      <textarea
        key={value}
        defaultValue={draft}
        onChange={e => {
          setDraft(e.target.value);
        }}
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "#ccc", background: "#f5f6f8", padding: 40, textAlign: "center" }}>
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

  if (!activeProject || !activeFeature) {
    return <EmptyState activeProject={activeProject} onGoToPipeline={onGoToPipeline} />;
  }

  const currentFeatureOutputs = featureOutputs[activeFeature.id] || {};
  const featureStageCount     = Object.keys(currentFeatureOutputs).length;
  const projectStageCount     = Object.keys(projectOutputs).length;
  const featureDescMissing    = !activeFeature.description?.trim();

  const constraintsMust   = constraints.filter(c => c.severity === "Must").length;
  const constraintsShould = constraints.filter(c => c.severity === "Should").length;

  return (
    <div style={{ height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

        {/* Project context bar */}
        <div style={{ marginBottom: 20, padding: "10px 16px", background: "#fff", border: "1px solid #0066FF18", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onGoToPipeline}
            style={{ padding: "4px 12px", background: "#0066FF0d", border: "1px solid #0066FF22", borderRadius: 20, color: "#0066FF", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
            ← Pipeline
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", flexShrink: 0 }}>
            📁 {activeProject.name}
          </span>
          <span style={{ fontSize: 12, color: "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeProject.description?.replace(/[#*`]/g, "").trim().slice(0, 100) || "No brief yet"}
          </span>
          {projectStageCount > 0 && (
            <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", flexShrink: 0 }}>
              {projectStageCount} strategy stages done
            </span>
          )}
        </div>

        {/* Feature header */}
        <SectionHeader
          icon="⚙️"
          title={activeFeature.name + " — Feature Spec"}
          subtitle="All project constraints are automatically applied to every stage below."
          color="#00AA44"
          count={featureStageCount}
        />

        {/* Feature description */}
        <FeatureDescription
          key={activeFeature.id}
          value={activeFeature.description}
          onSave={(desc) => updateFeature(activeFeature.id, activeFeature.name, desc)}
        />

        {/* Constraints summary */}
        {constraints.length > 0 && (
          <div style={{ marginBottom: 16, padding: "9px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#888", display: "flex", gap: 8, alignItems: "center" }}>
            <span>🔒</span>
            <span>
              {constraints.length} project constraint{constraints.length > 1 ? "s" : ""} active —{" "}
              <strong style={{ color: "#FF8800" }}>{constraintsMust} Must, {constraintsShould} Should</strong>.
              All stages will respect these.
            </span>
          </div>
        )}

        {/* Feature stages — inject CodeReadyStories after PRD */}
        {FEATURE_STAGES.map(stage => (
          <div key={activeFeature.id + "-" + stage.id}>
            <StageCard
              stage={stage}
              result={currentFeatureOutputs[stage.id] !== undefined ? currentFeatureOutputs[stage.id] : null}
              loading={false}
              descriptionMissing={featureDescMissing}
              interviewEndpoint={API + "/features/" + activeFeature.id + "/interview/" + stage.id}
              runEndpoint={API + "/features/" + activeFeature.id + "/run/" + stage.id}
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
    </div>
  );
}