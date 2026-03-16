// PMPipelineContext.jsx
// Single context provider for all PMPipeline state.
// Import usePMPipeline() in any child component instead of prop-drilling.

import { createContext, useContext, useState, useEffect } from "react";
import { API } from "./constants.js";

const PMPipelineContext = createContext(null);

export function PMPipelineProvider({ ps, discoveryProject: externalDiscovery, onDiscoveryDone, children }) {
  const {
    activeProject, activeFeature, projectOutputs, featureOutputs, constraints,
    saveProjectOutput, saveFeatureOutput, updateProject, updateFeature,
    addConstraint, updateConstraint, deleteConstraint,
  } = ps;

  const [discoveryProject, setDiscoveryProject] = useState(null);

  useEffect(() => {
    if (externalDiscovery) setDiscoveryProject(externalDiscovery);
  }, [externalDiscovery?.id]);

  const closeDiscovery = () => {
    setDiscoveryProject(null);
    if (onDiscoveryDone) onDiscoveryDone();
  };

  const completeDiscovery = (brief) => {
    closeDiscovery();
    updateProject(discoveryProject.id, discoveryProject.name, brief);
  };

  const currentFeatureOutputs = activeFeature ? (featureOutputs[activeFeature.id] || {}) : {};
  const projectStageCount     = Object.keys(projectOutputs).length;
  const featureStageCount     = activeFeature ? Object.keys(currentFeatureOutputs).length : 0;

  const projectDescriptionMissing = !activeProject?.description?.trim()
    || activeProject.description.trim().length < 20;

  const featureDescriptionMissing = activeFeature
    && !activeFeature.description?.trim();

  const value = {
    // Project
    activeProject,
    projectOutputs,
    projectStageCount,
    projectDescriptionMissing,
    updateProject,
    saveProjectOutput,

    // Feature
    activeFeature,
    currentFeatureOutputs,
    featureStageCount,
    featureDescriptionMissing,
    updateFeature,
    saveFeatureOutput,

    // Constraints
    constraints,
    addConstraint,
    updateConstraint,
    deleteConstraint,

    // Discovery interview
    discoveryProject,
    closeDiscovery,
    completeDiscovery,
  };

  return (
    <PMPipelineContext.Provider value={value}>
      {children}
    </PMPipelineContext.Provider>
  );
}

export function usePMPipeline() {
  const ctx = useContext(PMPipelineContext);
  if (!ctx) throw new Error("usePMPipeline must be used inside PMPipelineProvider");
  return ctx;
}
