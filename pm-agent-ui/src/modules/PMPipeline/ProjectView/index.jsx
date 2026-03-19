// ProjectView/index.jsx
// Renders the project strategy panel: brief, constraints, project stages.
// Reads state from PMPipelineContext — no prop drilling.

import { usePMPipeline } from "../PMPipelineContext.jsx";
import StageCard, { SectionHeader } from "../StageCard/index.jsx";
import ProjectBrief     from "./ProjectBrief.jsx";
import ConstraintsPanel from "./ConstraintsPanel.jsx";
import { PROJECT_STAGES, API } from "../constants.js";

export default function ProjectView() {
  const {
    activeProject,
    projectOutputs,
    projectStageCount,
    projectDescriptionMissing,
    updateProject,
    saveProjectOutput,
    constraints,
    addConstraint,
    updateConstraint,
    deleteConstraint,
  } = usePMPipeline();

  return (
    <>
      <SectionHeader
        icon="📁"
        title={activeProject.name + " — Project Strategy"}
        subtitle="Applies to the whole product. Run once, reused across all features."
        color="#0066FF"
        count={projectStageCount}
      />

      <ProjectBrief
        value={activeProject.description}
        projectId={activeProject.id}
        onSave={(desc) => updateProject(activeProject.id, activeProject.name, desc)}
      />

      <ConstraintsPanel
        constraints={constraints}
        onAdd={addConstraint}
        onUpdate={updateConstraint}
        onDelete={deleteConstraint}
      />

      {PROJECT_STAGES.map(stage => (
        <StageCard
          key={stage.id}
          stage={stage}
          result={projectOutputs[stage.id] !== undefined ? projectOutputs[stage.id] : null}
          loading={false}
          descriptionMissing={projectDescriptionMissing}
          interviewEndpoint={API + "/projects/" + activeProject.id + "/interview/" + stage.id}
          runEndpoint={API + "/projects/" + activeProject.id + "/run/" + stage.id}
          onResult={(result) => saveProjectOutput(stage.id, result)}
          projectName={activeProject.name}
        />
      ))}
    </>
  );
}