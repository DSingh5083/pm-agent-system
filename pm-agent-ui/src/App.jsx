// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useProjects } from "./lib/useProject.js";
import PMPipeline      from "./modules/PMPipeline/index.jsx";
import PMChat          from "./modules/PMChat/index.jsx";
import WritingEnhancer from "./modules/WritingEnhancer/index.jsx";

const MODULES = [
  { id: "pipeline", label: "Pipeline",  icon: "⚡" },
  { id: "chat",     label: "Assistant", icon: "🧠" },
  { id: "writing",  label: "Writing",   icon: "✍️" },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0)  return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function Sidebar({ projects, activeProject, loading, onSelect, onCreate, onDelete }) {
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hovered, setHovered]       = useState(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName(""); setCreating(false);
  };

  return (
    <div style={{ width: 224, background: "#111318", display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh" }}>

      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #ffffff0a" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>⚡ PM Agent</div>
        <div style={{ fontSize: 10, color: "#ffffff33", marginTop: 2, fontFamily: "monospace" }}>projects · auto-saved</div>
      </div>

      {/* New project */}
      <div style={{ padding: "10px 10px 6px" }}>
        {creating ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              autoFocus value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
              placeholder="Project name..."
              style={{ width: "100%", background: "#ffffff10", border: "1px solid #0066FF55", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={handleCreate} style={{ flex: 1, padding: "5px 0", background: "#0066FF", border: "none", borderRadius: 5, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Create</button>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: "5px 0", background: "#ffffff10", border: "none", borderRadius: 5, color: "#888", fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ width: "100%", padding: "7px 10px", background: "#0066FF15", border: "1px dashed #0066FF40", borderRadius: 8, color: "#5599FF", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Project
          </button>
        )}
      </div>

      {/* Project list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 8px" }}>
        {loading && <div style={{ fontSize: 11, color: "#ffffff22", textAlign: "center", padding: 20 }}>Loading...</div>}
        {!loading && projects.length === 0 && (
          <div style={{ fontSize: 11, color: "#ffffff22", textAlign: "center", padding: 20, lineHeight: 1.7 }}>No projects yet.<br />Create one above.</div>
        )}
        {projects.map(p => {
          const isActive = activeProject?.id === p.id;
          const isHovered = hovered === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: isActive ? "#0066FF1a" : isHovered ? "#ffffff08" : "transparent", border: `1px solid ${isActive ? "#0066FF44" : "transparent"}`, cursor: "pointer", transition: "all 0.1s", position: "relative" }}
            >
              <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? "#fff" : "#ffffffaa", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 18 }}>
                {p.name}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                {p.stage_count > 0 && <span style={{ fontSize: 9, color: "#5599FF", background: "#0066FF18", padding: "1px 6px", borderRadius: 8, fontFamily: "monospace" }}>{p.stage_count} stages</span>}
                {p.message_count > 0 && <span style={{ fontSize: 9, color: "#44BB77", background: "#00AA4418", padding: "1px 6px", borderRadius: 8, fontFamily: "monospace" }}>{p.message_count} msgs</span>}
                <span style={{ fontSize: 9, color: "#ffffff22", marginLeft: "auto" }}>{timeAgo(p.updated_at)}</span>
              </div>

              {confirmDelete === p.id ? (
                <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 5, top: 7, display: "flex", gap: 3 }}>
                  <button onClick={() => { onDelete(p.id); setConfirmDelete(null); }} style={{ fontSize: 9, padding: "2px 6px", background: "#FF4444", border: "none", borderRadius: 3, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Del</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 9, padding: "2px 5px", background: "#ffffff15", border: "none", borderRadius: 3, color: "#888", cursor: "pointer" }}>✕</button>
                </div>
              ) : (isHovered || isActive) && (
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ position: "absolute", right: 7, top: 8, background: "none", border: "none", color: "#ffffff33", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Module hints at bottom */}
      <div style={{ borderTop: "1px solid #ffffff08", padding: "8px 10px" }}>
        {MODULES.map(m => (
          <div key={m.id} style={{ padding: "4px 6px", fontSize: 11, color: "#ffffff33", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{m.icon}</span>{m.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState("pipeline");
  const projectState = useProjects();
  const { activeProject, projects, loading, loadProject, createProject, deleteProject } = projectState;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar
        projects={projects}
        activeProject={activeProject}
        loading={loading}
        onSelect={loadProject}
        onCreate={createProject}
        onDelete={deleteProject}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top nav */}
        <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", padding: "0 20px", gap: 4, flexShrink: 0 }}>
          {activeProject && (
            <span style={{ fontSize: 12, color: "#0066FF", background: "#0066FF0d", padding: "3px 10px", borderRadius: 20, fontWeight: 600, marginRight: 12 }}>
              {activeProject.name}
            </span>
          )}
          {MODULES.map(m => (
            <button key={m.id} onClick={() => setActiveModule(m.id)} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: activeModule === m.id ? "#1a1a2a" : "transparent", color: activeModule === m.id ? "#fff" : "#666", border: "none", fontWeight: activeModule === m.id ? 600 : 400, transition: "all 0.15s" }}>
              {m.icon} {m.label}
            </button>
          ))}
          {!activeProject && !loading && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#FF8800" }}>⚠️ Create a project to save your work</span>
          )}
        </div>

        {/* Module */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeModule === "pipeline" && <PMPipeline projectState={projectState} />}
          {activeModule === "chat"     && <PMChat     projectState={projectState} />}
          {activeModule === "writing"  && <WritingEnhancer />}
        </div>
      </div>
    </div>
  );
}