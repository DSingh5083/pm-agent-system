// FeatureView/index.jsx
// Renders the feature spec panel: context bar, description, constraints summary, stages.
// Reads from PMPipelineContext — no prop drilling.

import { usePMPipeline } from "../PMPipelineContext.jsx";
import StageCard, { SectionHeader } from "../StageCard/index.jsx";
import FeatureDescriptionInput from "./FeatureDescriptionInput.jsx";
import { FEATURE_STAGES } from "../constants.js";

export default function FeatureView() {
  const {
    activeProject,
    activeFeature,
    currentFeatureOutputs,
    featureStageCount,
    featureDescriptionMissing,
    projectStageCount,
    updateFeature,
    saveFeatureOutput,
    constraints,
  } = usePMPipeline();

  return (
    <div>
      {/* Slim project context bar */}
      <div style={{ marginBottom: 16, padding: "9px 16px", background: "#fff", border: "1px solid #0066FF18", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", background: "#0066FF0d", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
          📁 {activeProject.name}
        </span>
        <span style={{ fontSize: 12, color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeProject.description?.replace(/[#*`]/g, "").trim().slice(0, 120) || "No brief yet"}
        </span>
        {projectStageCount > 0 && (
          <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", flexShrink: 0 }}>
            {projectStageCount} strategy stages done
          </span>
        )}
      </div>

      <SectionHeader
        icon="⚙️"
        title={activeFeature.name + " — Feature Spec"}
        subtitle="Project constraints are automatically applied to every stage."
        color="#00AA44"
        count={featureStageCount}
      />

      <FeatureDescriptionInput
        value={activeFeature.description}
        onSave={(desc) => updateFeature(activeFeature.id, activeFeature.name, desc)}
      />

      {/* Constraints summary */}
      {constraints.length > 0 && (
        <div style={{ marginBottom: 16, padding: "9px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#888", display: "flex", gap: 8, alignItems: "center" }}>
          <span>🔒</span>
          <span>
            {constraints.length} project constraint{constraints.length > 1 ? "s" : ""} active —{" "}
            <strong style={{ color: "#FF8800" }}>
              {constraints.filter(c => c.severity === "Must").length} Must,{" "}
              {constraints.filter(c => c.severity === "Should").length} Should
            </strong>. All stages will respect these.
          </span>
        </div>
      )}

      {/* Feature stages — paths only, no API prefix (apiClient prepends base URL) */}
      {FEATURE_STAGES.map(stage => (
        <StageCard
          key={activeFeature.id + "-" + stage.id}
          stage={stage}
          result={currentFeatureOutputs[stage.id] !== undefined ? currentFeatureOutputs[stage.id] : null}
          loading={false}
          descriptionMissing={featureDescriptionMissing}
          interviewEndpoint={"/features/" + activeFeature.id + "/interview/" + stage.id}
          runEndpoint={"/features/" + activeFeature.id + "/run/" + stage.id}
          onResult={(result) => saveFeatureOutput(activeFeature.id, stage.id, result)}
          projectName={activeProject.name}
          featureName={activeFeature.name}
        />
      ))}
    </div>
  );
}