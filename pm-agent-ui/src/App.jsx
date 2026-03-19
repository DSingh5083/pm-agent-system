// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import AuthGate from "./components/AuthGate.jsx";
import { useProjects } from "./lib/useProject.js";
import PMPipeline      from "./modules/PMPipeline/index.jsx";
import PMChat          from "./modules/PMChat/index.jsx";
import WritingEnhancer from "./modules/WritingEnhancer/index.jsx";
import Docs            from "./modules/Docs/index.jsx";
import Features        from "./modules/Features/index.jsx";

const MODULES = [
  { id: "pipeline", label: "Pipeline",  icon: "⚡" },
  { id: "chat",     label: "Assistant", icon: "🧠" },
  { id: "writing",  label: "Writing",   icon: "✍️" },
  { id: "docs",     label: "Docs",      icon: "📄" },
  { id: "features",  label: "Features",  icon: "⚙️" },
];

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Sidebar({ ps, onNewProject, onFeatureSelect }) {
  const { projects, activeProject, features, activeFeature, loading,
          loadProject, createProject, deleteProject,
          createFeature, deleteFeature, setActiveFeature } = ps;

  const [creatingProject, setCreatingProject]   = useState(false);
  const [creatingFeature, setCreatingFeature]   = useState(false);
  const [newProjectName, setNewProjectName]     = useState("");
  const [newFeatureName, setNewFeatureName]     = useState("");
  const [confirmDelete, setConfirmDelete]       = useState(null);
  const [hovered, setHovered]                   = useState(null);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const project = await createProject(newProjectName.trim());
    setNewProjectName(""); setCreatingProject(false);
    if (onNewProject && project) onNewProject(project);
  };

  const handleCreateFeature = async () => {
    if (!newFeatureName.trim()) return;
    await createFeature(newFeatureName.trim());
    setNewFeatureName(""); setCreatingFeature(false);
  };

  return (
    <div style={{ width: 232, background: "#0f1117", display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", borderRight: "1px solid #ffffff0a" }}>

      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #ffffff08" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>⚡ PM Agent</div>
        <div style={{ fontSize: 10, color: "#ffffff30", marginTop: 2, fontFamily: "monospace" }}>projects · features · auto-saved</div>
      </div>

      {/* New project */}
      <div style={{ padding: "10px 10px 6px" }}>
        {creatingProject ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreateProject(); if (e.key === "Escape") setCreatingProject(false); }}
              placeholder="Project name..."
              style={{ width: "100%", background: "#ffffff10", border: "1px solid #0066FF55", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={handleCreateProject} style={{ flex: 1, padding: "5px", background: "#0066FF", border: "none", borderRadius: 5, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Create</button>
              <button onClick={() => setCreatingProject(false)} style={{ flex: 1, padding: "5px", background: "#ffffff10", border: "none", borderRadius: 5, color: "#888", fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreatingProject(true)} style={{ width: "100%", padding: "7px 10px", background: "#0066FF12", border: "1px dashed #0066FF35", borderRadius: 8, color: "#4d88ff", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>+</span> New Project
          </button>
        )}
      </div>

      {/* Project + feature tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 8px" }}>
        {loading && <div style={{ fontSize: 11, color: "#ffffff20", textAlign: "center", padding: 20 }}>Loading...</div>}
        {!loading && projects.length === 0 && <div style={{ fontSize: 11, color: "#ffffff20", textAlign: "center", padding: 20, lineHeight: 1.7 }}>No projects yet.</div>}

        {projects.map(p => {
          const isActiveProject = activeProject?.id === p.id;
          const isHov = hovered === p.id;

          return (
            <div key={p.id}>
              {/* Project row */}
              <div
                onClick={() => { loadProject(p); setActiveFeature(null); }}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 1, background: isActiveProject && !activeFeature ? "#0066FF1a" : isHov ? "#ffffff07" : "transparent", border: `1px solid ${isActiveProject && !activeFeature ? "#0066FF33" : "transparent"}`, cursor: "pointer", position: "relative", transition: "all 0.1s" }}
              >
                <div style={{ fontSize: 12, fontWeight: isActiveProject ? 700 : 400, color: isActiveProject ? "#fff" : "#ffffffaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 16 }}>
                  📁 {p.name}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 3, alignItems: "center" }}>
                  {p.feature_count > 0 && <span style={{ fontSize: 9, color: "#4d88ff", background: "#0066FF18", padding: "1px 5px", borderRadius: 8, fontFamily: "monospace" }}>{p.feature_count} features</span>}
                  <span style={{ fontSize: 9, color: "#ffffff22", marginLeft: "auto" }}>{timeAgo(p.updated_at)}</span>
                </div>
                {/* Delete project */}
                {confirmDelete === p.id ? (
                  <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 4, top: 6, display: "flex", gap: 3 }}>
                    <button onClick={() => { deleteProject(p.id); setConfirmDelete(null); }} style={{ fontSize: 9, padding: "2px 5px", background: "#FF4444", border: "none", borderRadius: 3, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Del</button>
                    <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 9, padding: "2px 4px", background: "#ffffff15", border: "none", borderRadius: 3, color: "#888", cursor: "pointer" }}>✕</button>
                  </div>
                ) : (isHov || (isActiveProject && !activeFeature)) && (
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ position: "absolute", right: 6, top: 8, background: "none", border: "none", color: "#ffffff25", fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
                )}
              </div>

              {/* Features under active project */}
              {isActiveProject && (
                <div style={{ marginLeft: 12, marginBottom: 4 }}>
                  {features.map(f => {
                    const isFActive = activeFeature?.id === f.id;
                    const isFHov = hovered === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => { setActiveFeature(f); if (onFeatureSelect) onFeatureSelect(f); }}
                        onMouseEnter={() => setHovered(f.id)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ padding: "7px 10px", borderRadius: 7, marginBottom: 1, background: isFActive ? "#00AA4415" : isFHov ? "#ffffff06" : "transparent", border: `1px solid ${isFActive ? "#00AA4430" : "transparent"}`, cursor: "pointer", position: "relative", transition: "all 0.1s" }}
                      >
                        <div style={{ fontSize: 11, fontWeight: isFActive ? 700 : 400, color: isFActive ? "#44CC88" : "#ffffff77", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 16 }}>
                          ⚙️ {f.name}
                        </div>
                        {f.output_count > 0 && (
                          <span style={{ fontSize: 9, color: "#44CC88", background: "#00AA4415", padding: "1px 5px", borderRadius: 8, fontFamily: "monospace", marginTop: 2, display: "inline-block" }}>{f.output_count} stages</span>
                        )}
                        {confirmDelete === f.id ? (
                          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 4, top: 5, display: "flex", gap: 3 }}>
                            <button onClick={() => { deleteFeature(f.id); setConfirmDelete(null); }} style={{ fontSize: 9, padding: "2px 5px", background: "#FF4444", border: "none", borderRadius: 3, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Del</button>
                            <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 9, padding: "2px 4px", background: "#ffffff15", border: "none", borderRadius: 3, color: "#888", cursor: "pointer" }}>✕</button>
                          </div>
                        ) : (isFHov || isFActive) && (
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(f.id); }} style={{ position: "absolute", right: 6, top: 7, background: "none", border: "none", color: "#ffffff25", fontSize: 13, cursor: "pointer", padding: 0 }}>×</button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add feature */}
                  {creatingFeature ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 2px" }}>
                      <input autoFocus value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleCreateFeature(); if (e.key === "Escape") setCreatingFeature(false); }}
                        placeholder="Feature name..."
                        style={{ width: "100%", background: "#ffffff10", border: "1px solid #00AA4440", borderRadius: 5, padding: "6px 8px", color: "#fff", fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={handleCreateFeature} style={{ flex: 1, padding: "4px", background: "#00AA44", border: "none", borderRadius: 4, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Add</button>
                        <button onClick={() => setCreatingFeature(false)} style={{ flex: 1, padding: "4px", background: "#ffffff10", border: "none", borderRadius: 4, color: "#888", fontSize: 10, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setCreatingFeature(true)} style={{ width: "100%", padding: "5px 8px", background: "transparent", border: "1px dashed #00AA4425", borderRadius: 6, color: "#00AA4466", fontSize: 11, cursor: "pointer", textAlign: "left" }}>
                      + Add Feature
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Module hints */}
      <div style={{ borderTop: "1px solid #ffffff08", padding: "8px 10px" }}>
        {MODULES.map(m => (
          <div key={m.id} style={{ padding: "3px 6px", fontSize: 10, color: "#ffffff25", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{m.icon}</span>{m.label}
          </div>
        ))}
      </div>
    </div>
    </AuthGate>
  );
}

export default function App() {
  const [activeModule, setActiveModule]         = useState("pipeline");
  const [discoveryProject, setDiscoveryProject] = useState(null);
  const [prevModule,    setPrevModule]    = useState("pipeline");
  const ps = useProjects();

  return (
    <AuthGate>
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar ps={ps}
        onNewProject={(p) => { setActiveModule("pipeline"); setDiscoveryProject(p); }}
        onFeatureSelect={() => { setPrevModule(activeModule); setActiveModule("features"); }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top nav */}
        <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", padding: "0 20px", gap: 4, flexShrink: 0 }}>
          {/* Breadcrumb */}
          {ps.activeProject && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 16 }}>
              <span
                onClick={() => ps.setActiveFeature(null)}
                style={{ fontSize: 12, color: ps.activeFeature ? "#888" : "#0066FF", background: ps.activeFeature ? "#f5f6f8" : "#0066FF0d", padding: "3px 10px", borderRadius: 20, fontWeight: 600, cursor: ps.activeFeature ? "pointer" : "default" }}
              >
                {ps.activeProject.name}
              </span>
              {ps.activeFeature && (
                <>
                  <span style={{ color: "#ccc", fontSize: 12 }}>›</span>
                  <span style={{ fontSize: 12, color: "#00AA44", background: "#00AA4410", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                    {ps.activeFeature.name}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Module tabs */}
          {MODULES.map(m => (
            <button key={m.id} onClick={() => setActiveModule(m.id)} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: activeModule === m.id ? "#1a1a2a" : "transparent", color: activeModule === m.id ? "#fff" : "#666", border: "none", fontWeight: activeModule === m.id ? 600 : 400, transition: "all 0.15s" }}>
              {m.icon} {m.label}
            </button>
          ))}

          {!ps.activeProject && !ps.loading && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#FF8800" }}>⚠️ Create a project to get started</span>
          )}
        </div>

        {/* Module */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeModule === "pipeline" && <PMPipeline ps={ps} discoveryProject={discoveryProject} onDiscoveryDone={() => setDiscoveryProject(null)} />}
          {activeModule === "chat"     && <PMChat     ps={ps} />}
          {activeModule === "writing"  && <WritingEnhancer />}
          {activeModule === "docs"      && <Docs ps={ps} />}
          {activeModule === "features"  && <Features ps={ps} onGoToPipeline={() => { setActiveModule(prevModule || "pipeline"); ps.setActiveFeature(null); }} />}
        </div>
      </div>
    </div>
    </AuthGate>
  );
}