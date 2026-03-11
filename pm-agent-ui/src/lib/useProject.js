import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3001";

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API error");
  }
  return res.json();
}

export function useProjects() {
  const [projects, setProjects]             = useState([]);
  const [activeProject, setActiveProject]   = useState(null);
  const [features, setFeatures]             = useState([]);
  const [activeFeature, setActiveFeature]   = useState(null);
  const [projectOutputs, setProjectOutputs] = useState({});
  const [featureOutputs, setFeatureOutputs] = useState({});
  const [constraints, setConstraints]       = useState([]);
  const [chatMessages, setChatMessages]     = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    api("GET", "/projects")
      .then(data => {
        setProjects(data);
        if (data.length > 0) loadProject(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadProject = useCallback(async (project) => {
    setActiveProject(project);
    setActiveFeature(null);
    setProjectOutputs({});
    setFeatureOutputs({});
    setConstraints([]);
    setChatMessages([]);

    const [outputs, feats, constrs, chat] = await Promise.all([
      api("GET", "/projects/" + project.id + "/outputs").catch(() => ({})),
      api("GET", "/projects/" + project.id + "/features").catch(() => []),
      api("GET", "/projects/" + project.id + "/constraints").catch(() => []),
      api("GET", "/projects/" + project.id + "/chat").catch(() => []),
    ]);

    setProjectOutputs(outputs);
    setFeatures(feats);
    setConstraints(constrs);
    setChatMessages(chat.map(m => ({ role: m.role, content: m.content })));

    // Preload all feature outputs
    const fOutputs = {};
    await Promise.all(feats.map(async (f) => {
      fOutputs[f.id] = await api("GET", "/features/" + f.id + "/outputs").catch(() => ({}));
    }));
    setFeatureOutputs(fOutputs);
  }, []);

  // PROJECTS

  const createProject = useCallback(async (name, description) => {
    const project = await api("POST", "/projects", { name, description: description || "" });
    setProjects(prev => [project, ...prev]);
    setActiveProject(project);
    setFeatures([]);
    setActiveFeature(null);
    setProjectOutputs({});
    setFeatureOutputs({});
    setConstraints([]);
    setChatMessages([]);
    return project;
  }, []);

  const updateProject = useCallback(async (id, name, description) => {
    const updated = await api("PATCH", "/projects/" + id, { name, description: description ?? "" });
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    if (activeProject?.id === id) setActiveProject(prev => ({ ...prev, ...updated }));
  }, [activeProject]);

  const deleteProject = useCallback(async (id) => {
    await api("DELETE", "/projects/" + id);
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeProject?.id === id) {
        if (next.length > 0) loadProject(next[0]);
        else {
          setActiveProject(null); setFeatures([]); setActiveFeature(null);
          setProjectOutputs({}); setFeatureOutputs({}); setConstraints([]); setChatMessages([]);
        }
      }
      return next;
    });
  }, [activeProject, loadProject]);

  // CONSTRAINTS

  const addConstraint = useCallback(async (type, title, description, severity) => {
    if (!activeProject) return;
    const constraint = await api("POST", "/projects/" + activeProject.id + "/constraints", { type, title, description, severity });
    setConstraints(prev => [...prev, constraint]);
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, constraint_count: (p.constraint_count || 0) + 1 } : p));
    return constraint;
  }, [activeProject]);

  const updateConstraint = useCallback(async (id, type, title, description, severity) => {
    await api("PATCH", "/constraints/" + id, { type, title, description, severity });
    setConstraints(prev => prev.map(c => c.id === id ? { ...c, type, title, description, severity } : c));
  }, []);

  const deleteConstraint = useCallback(async (id) => {
    await api("DELETE", "/constraints/" + id);
    setConstraints(prev => prev.filter(c => c.id !== id));
  }, []);

  // FEATURES

  const createFeature = useCallback(async (name, description) => {
    if (!activeProject) return;
    const feature = await api("POST", "/projects/" + activeProject.id + "/features", { name, description: description || "" });
    setFeatures(prev => [...prev, feature]);
    setActiveFeature(feature);
    setFeatureOutputs(prev => ({ ...prev, [feature.id]: {} }));
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, feature_count: (p.feature_count || 0) + 1 } : p));
    return feature;
  }, [activeProject]);

  const updateFeature = useCallback(async (id, name, description) => {
    const updated = await api("PATCH", "/features/" + id, { name, description: description ?? "" });
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
    if (activeFeature?.id === id) setActiveFeature(prev => ({ ...prev, ...updated }));
  }, [activeFeature]);

  const deleteFeature = useCallback(async (id) => {
    await api("DELETE", "/features/" + id);
    setFeatures(prev => {
      const next = prev.filter(f => f.id !== id);
      if (activeFeature?.id === id) setActiveFeature(null);
      return next;
    });
    setFeatureOutputs(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [activeFeature]);

  // OUTPUTS

  const saveProjectOutput = useCallback((stageId, content) => {
    setProjectOutputs(prev => ({ ...prev, [stageId]: content }));
  }, []);

  const saveFeatureOutput = useCallback((featureId, stageId, content) => {
    setFeatureOutputs(prev => ({
      ...prev,
      [featureId]: { ...(prev[featureId] || {}), [stageId]: content },
    }));
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, output_count: (f.output_count || 0) + 1 } : f));
  }, []);

  // CHAT

  const clearChat = useCallback(async () => {
    if (!activeProject) return;
    await api("DELETE", "/projects/" + activeProject.id + "/chat");
    setChatMessages([]);
  }, [activeProject]);

  return {
    projects, activeProject, features, activeFeature,
    projectOutputs, featureOutputs, constraints,
    chatMessages, loading,
    loadProject,
    createProject, updateProject, deleteProject,
    addConstraint, updateConstraint, deleteConstraint,
    createFeature, updateFeature, deleteFeature,
    setActiveFeature,
    saveProjectOutput, saveFeatureOutput,
    clearChat, setChatMessages,
  };
}
