// ─────────────────────────────────────────────────────────────────────────────
// lib/useProject.js
// Central hook — manages project list, active project, and pipeline results.
// Import this in any component that needs project awareness.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3001";

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
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
  const [projects, setProjects]         = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [pipelineResults, setPipelineResults] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading]           = useState(true);

  // Load all projects on mount
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
    setPipelineResults({});
    setChatMessages([]);

    // Load pipeline outputs and chat in parallel
    const [pipeline, chat] = await Promise.all([
      api("GET", `/projects/${project.id}/pipeline`).catch(() => ({})),
      api("GET", `/projects/${project.id}/chat`).catch(() => []),
    ]);

    setPipelineResults(pipeline);
    setChatMessages(chat.map(m => ({ role: m.role, content: m.content })));
  }, []);

  const createProject = useCallback(async (name, idea = "") => {
    const project = await api("POST", "/projects", { name, idea });
    setProjects(prev => [project, ...prev]);
    setActiveProject(project);
    setPipelineResults({});
    setChatMessages([]);
    return project;
  }, []);

  const updateProject = useCallback(async (id, name, idea) => {
    const updated = await api("PATCH", `/projects/${id}`, { name, idea });
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    if (activeProject?.id === id) setActiveProject(prev => ({ ...prev, ...updated }));
    return updated;
  }, [activeProject]);

  const deleteProject = useCallback(async (id) => {
    await api("DELETE", `/projects/${id}`);
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeProject?.id === id) {
        if (next.length > 0) loadProject(next[0]);
        else { setActiveProject(null); setPipelineResults({}); setChatMessages([]); }
      }
      return next;
    });
  }, [activeProject, loadProject]);

  const savePipelineStage = useCallback(async (stage, content) => {
    if (!activeProject) return;
    setPipelineResults(prev => ({ ...prev, [stage]: content }));
    await api("POST", `/projects/${activeProject.id}/pipeline/${stage}`, { content });
    // Update stage_count in sidebar
    setProjects(prev => prev.map(p =>
      p.id === activeProject.id
        ? { ...p, stage_count: (p.stage_count || 0) + 1, updated_at: new Date().toISOString() }
        : p
    ));
  }, [activeProject]);

  const clearChat = useCallback(async () => {
    if (!activeProject) return;
    await api("DELETE", `/projects/${activeProject.id}/chat`);
    setChatMessages([]);
  }, [activeProject]);

  const addChatMessage = useCallback((message) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  return {
    projects,
    activeProject,
    pipelineResults,
    chatMessages,
    loading,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    savePipelineStage,
    clearChat,
    addChatMessage,
    setChatMessages,
  };
}
