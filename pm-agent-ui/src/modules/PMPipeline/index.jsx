// PMPipeline/index.jsx
// Project-only pipeline. Features have their own tab (src/modules/Features).
// All state lives in PMPipelineContext. All AI logic lives in hooks/.

import { PMPipelineProvider, usePMPipeline } from "./PMPipelineContext.jsx";
import ProjectView from "./ProjectView/index.jsx";
import DiscoveryInterviewModal from "./shared/DiscoveryInterview.jsx";

function PipelineRouter() {
  const { activeProject, discoveryProject, closeDiscovery, completeDiscovery } = usePMPipeline();

  if (!activeProject) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#ccc", background: "#f5f6f8" }}>
        <div style={{ fontSize: 48 }}>⚡</div>
        <div style={{ fontSize: 14 }}>Create or select a project to get started</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>
      {discoveryProject && (
        <DiscoveryInterviewModal
          project={discoveryProject}
          onClose={closeDiscovery}
          onComplete={completeDiscovery}
        />
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <ProjectView />
      </div>
    </div>
  );
}

export default function PMPipeline({ ps, discoveryProject, onDiscoveryDone }) {
  return (
    <PMPipelineProvider ps={ps} discoveryProject={discoveryProject} onDiscoveryDone={onDiscoveryDone}>
      <PipelineRouter />
    </PMPipelineProvider>
  );
}