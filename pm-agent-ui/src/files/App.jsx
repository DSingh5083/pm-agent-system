// ─────────────────────────────────────────────────────────────────────────────
// App.jsx
//
// Pure shell. Handles nav + module switching only.
// NEVER add business logic here. Add modules to registry.js instead.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { MODULES } from "./modules/registry.js";

export default function App() {
  const [activeId, setActiveId] = useState(MODULES[0].id);
  const ActiveModule = MODULES.find(m => m.id === activeId)?.component;

  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      color: "#1a1a2a", background: "#f5f6f8", overflow: "hidden",
    }}>

      {/* ── Top Nav ── */}
      <nav style={{
        background: "#fff", borderBottom: "1px solid #e8e8e8",
        padding: "0 32px", display: "flex", alignItems: "center",
        height: 56, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        gap: 24, flexShrink: 0, width: "100%",
      }}>
        {/* Logo */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0066FF", letterSpacing: "0.05em", fontFamily: "monospace", marginRight: 8 }}>
          ⚡ PM AGENT
        </div>

        {/* Module tabs — auto-generated from registry */}
        <div style={{ display: "flex", gap: 4 }}>
          {MODULES.map(mod => (
            <button
              key={mod.id}
              onClick={() => setActiveId(mod.id)}
              title={mod.description}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 13,
                cursor: "pointer", border: "none",
                background: activeId === mod.id ? "#0066FF" : "transparent",
                color: activeId === mod.id ? "#fff" : "#666",
                fontWeight: activeId === mod.id ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {mod.icon} {mod.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Active Module ── */}
      <main style={{ flex: 1, overflow: "hidden", width: "100%" }}>
        {ActiveModule && <ActiveModule />}
      </main>
    </div>
  );
}
