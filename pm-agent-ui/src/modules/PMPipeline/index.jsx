import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const PROJECT_STAGES = [
  { id: "competitor",      icon: "🌐", label: "Competitor Intel",   color: "#FF8800", description: "Live web search · who's winning · gaps to exploit",       useWebSearch: true  },
  { id: "market_analysis", icon: "📊", label: "Market Analysis",    color: "#0066FF", description: "Market size · trends · target segments · growth signals",  useWebSearch: true  },
  { id: "roadmap",         icon: "🗺️", label: "Product Roadmap",   color: "#8B00FF", description: "Phased delivery · milestones · dependencies",              useWebSearch: false },
  { id: "gtm",             icon: "🚀", label: "Go To Market",       color: "#FF4444", description: "Launch strategy · positioning · channels · pricing",       useWebSearch: false },
];

const FEATURE_STAGES = [
  { id: "prd",          icon: "📄", label: "PRD",                    color: "#0066FF", description: "Full product requirements document",                         renderer: "text"    },
  { id: "architecture", icon: "🏗️", label: "Technical Architecture", color: "#0099AA", description: "System design · data models · API contracts",               renderer: "text"    },
  { id: "flow",         icon: "🔀", label: "High Level Flow",         color: "#AA00AA", description: "User journey · system interactions · edge cases",            renderer: "text"    },
  { id: "ui_spec",      icon: "🎨", label: "UI Spec",                 color: "#E91E8C", description: "Screen inventory · components · interactions",               renderer: "text"    },
  { id: "diagram",      icon: "📐", label: "Visual Diagram",          color: "#2E7D32", description: "Flow · sequence · ER diagrams — rendered visually",          renderer: "mermaid" },
  { id: "review",       icon: "🔍", label: "Spec Review",             color: "#FF4444", description: "Gap analysis · risks · constraint compliance",               renderer: "text"    },
  { id: "tickets",      icon: "🎫", label: "Tickets",                 color: "#00AA44", description: "Jira-ready dev tickets with acceptance criteria",             renderer: "tickets" },
];

const CONSTRAINT_TYPES     = ["Compliance", "Security", "Legal", "Operational", "Technical", "Accessibility", "Performance", "Other"];
const SEVERITY_COLORS      = { Must: "#FF4444", Should: "#FF8800", "Nice to have": "#00AA44" };

// ── Interview modal ───────────────────────────────────────────────────────────

function InterviewModal({ stage, interviewEndpoint, runEndpoint, onComplete, onCancel }) {
  const [phase, setPhase]       = useState("loading"); // loading | questions | running | distilling
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]   = useState({});
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(interviewEndpoint, { method: "POST", headers: { "Content-Type": "application/json" } })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setQuestions(data.questions || []);
        const init = {};
        (data.questions || []).forEach((_, i) => { init[i] = ""; });
        setAnswers(init);
        setPhase("questions");
      })
      .catch(e => { setError(e.message); setPhase("questions"); });
  }, []);

  const handleSubmit = async (skipAnswers) => {
    setPhase("distilling");
    setError(null);

    let interviewAnswers = "";
    if (!skipAnswers) {
      const filled = questions
        .map((q, i) => answers[i]?.trim() ? `Q: ${q}\nA: ${answers[i].trim()}` : null)
        .filter(Boolean);
      interviewAnswers = filled.join("\n\n");
    }

    try {
      setPhase("running");
      const body = interviewAnswers ? { interviewAnswers } : {};
      const res  = await fetch(runEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onComplete(data.result);
    } catch (e) {
      setError(e.message);
      setPhase("questions");
    }
  };

  const answeredCount = Object.values(answers).filter(a => a.trim()).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f0", background: stage.color + "06" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: stage.color + "18", border: "1.5px solid " + stage.color + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{stage.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2a" }}>Before generating {stage.label}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>Answer these to get specific, not generic, output</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {phase === "loading" && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#aaa" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>🧠</div>
              <div style={{ fontSize: 13 }}>Reading your project context...</div>
              <div style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>Generating questions specific to your product</div>
            </div>
          )}

          {(phase === "questions" || phase === "running" || phase === "distilling") && (
            <>
              {error && (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FF444410", border: "1px solid #FF444430", borderRadius: 8, color: "#FF4444", fontSize: 12 }}>
                  {error}
                </div>
              )}

              {questions.length === 0 && !error && (
                <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                  Context looks good. Click Generate to proceed.
                </div>
              )}

              {questions.map((q, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2a", marginBottom: 7, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: stage.color + "18", border: "1px solid " + stage.color + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: stage.color, marginTop: 1 }}>{i + 1}</span>
                    <span>{q}</span>
                  </div>
                  <textarea
                    value={answers[i] || ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    disabled={phase !== "questions"}
                    placeholder="Your answer..."
                    rows={2}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid " + (answers[i]?.trim() ? stage.color + "66" : "#e0e0e0"), fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.6, color: "#1a1a2a", background: phase !== "questions" ? "#fafafa" : "#fff", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  />
                </div>
              ))}

              {(phase === "running" || phase === "distilling") && (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#aaa" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>
                    {phase === "distilling" ? "📋" : stage.icon}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>
                    {phase === "distilling" ? "Distilling prior context..." : "Generating " + stage.label + "..."}
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                    {phase === "distilling"
                      ? "Synthesising everything known about this project"
                      : "Using full context + your answers for a specific output"}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {phase === "questions" && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, fontSize: 11, color: "#bbb" }}>
              {answeredCount > 0 ? answeredCount + " of " + questions.length + " answered" : "All answers optional — skip to use context only"}
            </div>
            <button onClick={onCancel} style={{ padding: "7px 14px", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 12, color: "#888", cursor: "pointer" }}>
              Cancel
            </button>
            {questions.length > 0 && (
              <button onClick={() => handleSubmit(true)} style={{ padding: "7px 14px", background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 12, color: "#666", cursor: "pointer" }}>
                Skip questions
              </button>
            )}
            <button onClick={() => handleSubmit(false)}
              style={{ padding: "8px 20px", background: "linear-gradient(135deg, " + stage.color + "cc, " + stage.color + ")", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 10px " + stage.color + "40" }}>
              Generate {stage.label} ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Project Brief (structured fields, auto-save on blur) ─────────────────────

const BRIEF_FIELDS = [
  { key: "product",  label: "Product",        placeholder: "What is it? One sentence tagline.",               required: true,  wide: false },
  { key: "audience", label: "Target Audience", placeholder: "Who is this for? Be specific.",                   required: false, wide: false },
  { key: "problem",  label: "Problem",         placeholder: "What problem does it solve?",                     required: true,  wide: true  },
  { key: "goal",     label: "Business Goal",   placeholder: "What does success look like? Revenue, users...", required: false, wide: true  },
  { key: "stack",    label: "Tech Stack",      placeholder: "e.g. React, Node, Postgres, AWS",                required: false, wide: false },
];

function parseBrief(raw) {
  if (!raw) return {};
  try { const p = JSON.parse(raw); if (p && typeof p === "object") return p; } catch {}
  return { product: raw };
}

function ProjectBrief({ value, onSave }) {
  const [brief, setBrief] = useState(() => parseBrief(value));
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => { setBrief(parseBrief(value)); }, [value]);

  const saveField = async (key, val) => {
    const updated = { ...brief, [key]: val };
    setBrief(updated);
    setSaving(true);
    await onSave(JSON.stringify(updated));
    setSaving(false);
    setLastSaved(new Date());
  };

  const filled   = BRIEF_FIELDS.filter(f => brief[f.key]?.trim()).length;
  const isReady  = BRIEF_FIELDS.filter(f => f.required).every(f => brief[f.key]?.trim());

  return (
    <div style={{ marginBottom: 20, background: "#fff", border: "1.5px solid #0066FF22", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,102,255,0.05)" }}>

      {/* Header */}
      <div style={{ padding: "11px 18px", background: "#0066FF06", borderBottom: "1px solid #0066FF10", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>Project Brief</div>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: isReady ? "#00AA44" : "#FF8800", background: isReady ? "#00AA4412" : "#FF880012", padding: "1px 7px", borderRadius: 10 }}>
            {filled}/{BRIEF_FIELDS.length} filled
          </span>
          {!isReady && <span style={{ fontSize: 11, color: "#FF8800" }}>Fill Product + Problem to unlock stages</span>}
        </div>
        <div style={{ fontSize: 11, color: "#ccc", fontFamily: "monospace" }}>
          {saving ? "saving..." : lastSaved ? "auto-saved" : "edits save on blur"}
        </div>
      </div>

      {/* Fields — auto-save on blur */}
      <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {BRIEF_FIELDS.map(f => {
          const fieldStyle = {
            width: "100%", padding: "8px 11px", borderRadius: 8,
            border: "1.5px solid " + (brief[f.key]?.trim() ? "#0066FF33" : "#eee"),
            fontSize: 13, fontFamily: "inherit", color: "#1a1a2a",
            outline: "none", boxSizing: "border-box",
            background: "#fafafa", transition: "border-color 0.15s",
            resize: f.wide ? "none" : undefined,
          };
          return (
            <div key={f.key} style={{ gridColumn: f.wide ? "1 / -1" : "auto" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                {f.label}
                {f.required && <span style={{ color: "#FF4444", fontSize: 10 }}>*</span>}
              </label>
              {f.wide ? (
                <textarea
                  defaultValue={brief[f.key] || ""}
                  key={f.key + value}
                  placeholder={f.placeholder}
                  rows={2}
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = "#0066FF"}
                  onBlur={e => { e.target.style.borderColor = e.target.value.trim() ? "#0066FF33" : "#eee"; saveField(f.key, e.target.value); }}
                />
              ) : (
                <input
                  defaultValue={brief[f.key] || ""}
                  key={f.key + value}
                  placeholder={f.placeholder}
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = "#0066FF"}
                  onBlur={e => { e.target.style.borderColor = e.target.value.trim() ? "#0066FF33" : "#eee"; saveField(f.key, e.target.value); }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Feature description input ──────────────────────────────────────────────────

function FeatureDescriptionInput({ value, onSave }) {
  const [focused,   setFocused]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const handleBlur = async (e) => {
    setFocused(false);
    if (!e.target.value.trim()) return;
    setSaving(true);
    await onSave(e.target.value.trim());
    setSaving(false);
    setLastSaved(new Date());
  };

  return (
    <div style={{ marginBottom: 18, background: "#fff", border: "1.5px solid " + (focused ? "#00AA44" : "#00AA4422"), borderRadius: 12, overflow: "hidden", boxShadow: focused ? "0 0 0 3px #00AA4412" : "none", transition: "all 0.15s" }}>
      <div style={{ padding: "10px 14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
          Feature Context
          <span style={{ color: "#FF4444", fontSize: 10 }}>*</span>
        </div>
        <div style={{ fontSize: 11, color: "#ccc", fontFamily: "monospace" }}>
          {saving ? "saving..." : lastSaved ? "auto-saved" : "saves on blur"}
        </div>
      </div>
      <textarea
        defaultValue={value || ""}
        key={value}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder="What is this feature? Who uses it, what's in scope, what's explicitly out of scope, any technical constraints."
        rows={3}
        style={{ width: "100%", padding: "10px 14px", fontSize: 13, fontFamily: "inherit", color: "#1a1a2a", lineHeight: 1.7, border: "none", outline: "none", resize: "none", boxSizing: "border-box", background: "transparent" }}
      />
      <div style={{ padding: "6px 14px", borderTop: "1px solid #f0f0f0" }}>
        <span style={{ fontSize: 11, color: "#ccc" }}>Used by all feature stages · Cmd+Enter to save</span>
      </div>
    </div>
  );
}

// Constraint form - defined at module level so React never remounts it on keystroke

function ConstraintForm({ form, setForm, onSubmit, onCancel, label }) {
  return (
    <div style={{ background: "#f5f6f8", border: "1px solid #e0e0e0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
          {CONSTRAINT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, fontFamily: "inherit", background: "#fff", color: SEVERITY_COLORS[form.severity] || "#333", fontWeight: 700 }}>
          {Object.keys(SEVERITY_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <input
        value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        placeholder="Title (e.g. PCI-DSS, GDPR, WCAG AA)"
        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", marginBottom: 6, boxSizing: "border-box", outline: "none" }}
      />
      <textarea
        value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        placeholder="What does this mean in practice?"
        rows={2}
        style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, fontFamily: "inherit", resize: "none", marginBottom: 8, boxSizing: "border-box", outline: "none", lineHeight: 1.6 }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onSubmit} style={{ padding: "5px 14px", background: "#FF8800", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
        <button onClick={onCancel} style={{ padding: "5px 12px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function ConstraintsPanel({ constraints, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({ type: "Compliance", title: "", description: "", severity: "Must" });
  const resetForm = () => setForm({ type: "Compliance", title: "", description: "", severity: "Must" });

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await onAdd(form.type, form.title.trim(), form.description.trim(), form.severity);
    resetForm(); setAdding(false);
  };

  const handleUpdate = async () => {
    if (!form.title.trim()) return;
    await onUpdate(editing, form.type, form.title.trim(), form.description.trim(), form.severity);
    setEditing(null); resetForm();
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({ type: c.type, title: c.title, description: c.description, severity: c.severity });
    setAdding(false);
  };

  return (
    <div style={{ marginBottom: 20, background: "#fff", border: "1px solid #FF880022", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#FF880008", borderBottom: "1px solid #FF880015" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 8 }}>
            Project Constraints
            {constraints.length > 0 && <span style={{ fontSize: 10, color: "#FF8800", background: "#FF880015", padding: "1px 7px", borderRadius: 10, fontFamily: "monospace" }}>{constraints.length}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>Injected into every feature stage automatically</div>
        </div>
        <button onClick={() => { setAdding(!adding); setEditing(null); resetForm(); }} style={{ padding: "5px 12px", background: adding ? "#f0f0f0" : "#FF8800", border: "none", borderRadius: 7, color: adding ? "#888" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {adding && (
          <ConstraintForm
            form={form} setForm={setForm}
            onSubmit={handleAdd}
            onCancel={() => { setAdding(false); resetForm(); }}
            label="Add Constraint"
          />
        )}
        {constraints.length === 0 && !adding && (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#ccc", fontSize: 12, fontStyle: "italic" }}>
            No constraints yet. Add compliance, security, or operational requirements.
          </div>
        )}
        {constraints.map(c => (
          <div key={c.id}>
            {editing === c.id ? (
              <ConstraintForm
                form={form} setForm={setForm}
                onSubmit={handleUpdate}
                onCancel={() => { setEditing(null); resetForm(); }}
                label="Save"
              />
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: (SEVERITY_COLORS[c.severity] || "#888") + "15", color: SEVERITY_COLORS[c.severity] || "#888", border: "1px solid " + (SEVERITY_COLORS[c.severity] || "#888") + "33", fontWeight: 700, textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0, marginTop: 2 }}>{c.severity}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "#888", background: "#f0f0f0", padding: "1px 6px", borderRadius: 6, fontFamily: "monospace" }}>{c.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2a" }}>{c.title}</span>
                  </div>
                  {c.description && <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{c.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => startEdit(c)} style={{ padding: "3px 8px", fontSize: 11, background: "none", border: "1px solid #e0e0e0", borderRadius: 5, color: "#888", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => onDelete(c.id)} style={{ padding: "3px 8px", fontSize: 11, background: "none", border: "1px solid #FF444422", borderRadius: 5, color: "#FF4444", cursor: "pointer" }}>Del</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Content renderers ─────────────────────────────────────────────────────────

function CopyBtn({ getText }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: copied ? "#00AA4422" : "#f5f6f8", color: copied ? "#00AA44" : "#888", border: "1px solid " + (copied ? "#00AA4433" : "#e0e0e0"), cursor: "pointer" }}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SectionedText({ content, color }) {
  const sections = content.split(/\n##\s+/).filter(Boolean);
  if (sections.length <= 1) return <pre style={{ fontSize: 13, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", margin: 0 }}>{content}</pre>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map((sec, i) => {
        const nl    = sec.indexOf("\n");
        const title = (i === 0 ? sec : sec.slice(0, nl)).trim();
        const body  = i === 0 ? "" : sec.slice(nl + 1).trim();
        if (!body) return null;
        return (
          <div key={i} style={{ background: "#fff", border: "1px solid " + color + "18", borderRadius: 10, overflow: "hidden", borderLeft: "3px solid " + color }}>
            <div style={{ padding: "9px 14px", background: color + "06", borderBottom: "1px solid " + color + "10" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
            </div>
            <pre style={{ padding: "12px 14px", fontSize: 13, color: "#333", lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", margin: 0 }}>{body}</pre>
          </div>
        );
      })}
    </div>
  );
}

function TicketList({ tickets }) {
  const typeColor = { feature: "#0066FF", bug: "#FF4444", chore: "#888" };
  const totalPts  = tickets.reduce((s, t) => s + (t.storyPoints || 0), 0);
  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ l: "Tickets", v: tickets.length, c: "#0066FF" }, { l: "Points", v: totalPts, c: "#8B00FF" }, { l: "Features", v: tickets.filter(t => t.type === "feature").length, c: "#00AA44" }, { l: "Chores", v: tickets.filter(t => t.type === "chore").length, c: "#888" }].map(({ l, v, c }) => (
          <div key={l} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "10px 16px" }}>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {tickets.map((t, i) => {
        const c = typeColor[t.type] || "#888";
        return (
          <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: "4px solid " + c }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2a", flex: 1, marginRight: 10 }}>{t.title}</div>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: c + "11", color: c, border: "1px solid " + c + "33", fontFamily: "monospace", textTransform: "uppercase" }}>{t.type}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#00AA4411", color: "#00AA44", border: "1px solid #00AA4433", fontFamily: "monospace" }}>{t.storyPoints}pt</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7, marginBottom: t.acceptanceCriteria?.length ? 8 : 0 }}>{t.description}</div>
            {t.acceptanceCriteria?.length > 0 && (
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 5 }}>Acceptance Criteria</div>
                {t.acceptanceCriteria.map((ac, j) => (
                  <div key={j} style={{ fontSize: 12, color: "#555", display: "flex", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: "#00AA44", fontWeight: 700, flexShrink: 0 }}>✓</span><span>{ac}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function MermaidBlock({ code }) {
  const [svg, setSvg] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        if (!window.mermaid) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            s.onload = res; s.onerror = rej; document.head.appendChild(s);
          });
          window.mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
        }
        const { svg } = await window.mermaid.render("m-" + Math.random().toString(36).slice(2), code);
        if (!cancelled) setSvg(svg);
      } catch (e) { if (!cancelled) setErr(e.message); }
    }
    render(); return () => { cancelled = true; };
  }, [code]);
  if (err) return <pre style={{ fontSize: 11, fontFamily: "monospace", background: "#f5f6f8", padding: 10, borderRadius: 6, overflow: "auto" }}>{code}</pre>;
  if (!svg) return <div style={{ fontSize: 11, color: "#aaa" }}>Rendering...</div>;
  return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ overflowX: "auto" }} />;
}

function MermaidDiagram({ content }) {
  const blocks = [];
  const re = /DIAGRAM:\s*(.+?)\n```mermaid\n([\s\S]+?)```/g;
  let m;
  while ((m = re.exec(content)) !== null) blocks.push({ title: m[1].trim(), code: m[2].trim() });
  if (!blocks.length) { const r = content.match(/```mermaid\n([\s\S]+?)```/); if (r) blocks.push({ title: "Diagram", code: r[1].trim() }); }
  if (!blocks.length) return <pre style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 1.7 }}>{content}</pre>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {blocks.map((b, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #2E7D3222", borderRadius: 10, overflow: "hidden", borderLeft: "3px solid #2E7D32" }}>
          <div style={{ padding: "9px 14px", background: "#2E7D3208", borderBottom: "1px solid #2E7D3210" }}><span style={{ fontSize: 12, fontWeight: 700, color: "#2E7D32" }}>📐 {b.title}</span></div>
          <div style={{ padding: 16 }}><MermaidBlock code={b.code} /></div>
        </div>
      ))}
    </div>
  );
}

function StageOutput({ stage, result }) {
  if (stage.renderer === "tickets" && Array.isArray(result)) return <TicketList tickets={result} />;
  if (stage.renderer === "mermaid" && typeof result === "string") return <MermaidDiagram content={result} />;
  if (typeof result === "string") return <SectionedText content={result} color={stage.color} />;
  return null;
}

// ── Stage card ────────────────────────────────────────────────────────────────

function StageCard({ stage, result, loading, descriptionMissing, onRun, interviewEndpoint, runEndpoint, onResult }) {
  const [expanded, setExpanded]       = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const hasResult = result !== null && result !== undefined;

  useEffect(() => { if (hasResult) setExpanded(true); }, [hasResult]);

  const handleRun = () => {
    if (descriptionMissing) return;
    setShowInterview(true);
  };

  const previewText = () => {
    if (!hasResult) return "";
    if (stage.renderer === "tickets" && Array.isArray(result)) return result.length + " tickets generated";
    if (stage.renderer === "mermaid") return "Visual diagrams ready";
    if (typeof result === "string") return result.slice(0, 160) + "...";
    return "";
  };

  return (
    <>
      {showInterview && (
        <InterviewModal
          stage={stage}
          interviewEndpoint={interviewEndpoint}
          runEndpoint={runEndpoint}
          onComplete={(r) => { onResult(r); setShowInterview(false); }}
          onCancel={() => setShowInterview(false)}
        />
      )}

      <div style={{ background: "#fff", border: "1px solid " + stage.color + "20", borderRadius: 12, overflow: "hidden", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: "3px solid " + stage.color }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: stage.color + "05", borderBottom: (hasResult || loading) ? "1px solid " + stage.color + "10" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: stage.color + "15", border: "1.5px solid " + stage.color + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{stage.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a", display: "flex", alignItems: "center", gap: 7 }}>
                {stage.label}
                {stage.useWebSearch && <span style={{ fontSize: 9, color: "#FF8800", background: "#FF880010", padding: "1px 6px", borderRadius: 8, border: "1px solid #FF880030", fontWeight: 600 }}>🌐 Live</span>}
                {hasResult && <span style={{ fontSize: 9, color: "#00AA44", fontFamily: "monospace" }}>✓ saved</span>}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{stage.description}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {loading && <span style={{ fontSize: 11, color: stage.color, fontFamily: "monospace" }}>generating...</span>}
            {hasResult && !loading && (
              <>
                <CopyBtn getText={() => stage.renderer === "tickets" ? JSON.stringify(result, null, 2) : result} />
                <button onClick={handleRun} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, background: "transparent", color: stage.color, border: "1px solid " + stage.color + "40", cursor: "pointer", fontWeight: 600 }}>Redo</button>
                <button onClick={() => setExpanded(!expanded)} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, background: "#f5f6f8", color: "#666", border: "1px solid #e0e0e0", cursor: "pointer" }}>{expanded ? "▲" : "▼"}</button>
              </>
            )}
            {!hasResult && !loading && (
              <div style={{ display: "flex", flex: "column", alignItems: "flex-end", gap: 4 }}>
                {descriptionMissing && (
                  <div style={{ fontSize: 10, color: "#FF8800", textAlign: "right", maxWidth: 160 }}>
                    ⚠️ Add a description first for specific output
                  </div>
                )}
                <button onClick={handleRun} disabled={descriptionMissing}
                  style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: descriptionMissing ? "#e8e8e8" : "linear-gradient(135deg, " + stage.color + "cc, " + stage.color + ")", color: descriptionMissing ? "#aaa" : "#fff", border: "none", cursor: descriptionMissing ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                  Run ↗
                </button>
              </div>
            )}
          </div>
        </div>
        {hasResult && expanded && <div style={{ padding: "16px 20px", background: "#fafafa" }}><StageOutput stage={stage} result={result} /></div>}
        {hasResult && !expanded && (
          <div onClick={() => setExpanded(true)} style={{ padding: "10px 16px", fontSize: 12, color: "#999", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewText()}</span>
            <span style={{ color: stage.color, fontWeight: 600, flexShrink: 0 }}>Expand ↓</span>
          </div>
        )}
        {!hasResult && !loading && !descriptionMissing && (
          <div style={{ padding: "8px 16px", fontSize: 11, color: "#ccc", fontStyle: "italic" }}>
            Click Run — you'll be asked a few questions first to improve output quality
          </div>
        )}
      </div>
    </>
  );
}

function SectionHeader({ icon, title, subtitle, color, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "15", border: "1px solid " + color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2a" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#aaa" }}>{subtitle}</div>
      </div>
      {count > 0 && <span style={{ fontSize: 10, color, background: color + "15", padding: "2px 8px", borderRadius: 10, fontFamily: "monospace", fontWeight: 600 }}>{count} saved</span>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PMPipeline({ ps }) {
  const { activeProject, activeFeature, projectOutputs, featureOutputs, constraints,
          saveProjectOutput, saveFeatureOutput, updateProject, updateFeature,
          addConstraint, updateConstraint, deleteConstraint } = ps;

  const currentFeatureOutputs = activeFeature ? (featureOutputs[activeFeature.id] || {}) : {};

  if (!activeProject) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#ccc", background: "#f5f6f8" }}>
        <div style={{ fontSize: 48 }}>⚡</div>
        <div style={{ fontSize: 14 }}>Create or select a project to get started</div>
      </div>
    );
  }

  const projectDescriptionMissing = !activeProject.description?.trim() || activeProject.description.trim().length < 20;
  const featureDescriptionMissing = activeFeature && !activeFeature.description?.trim();
  const projectStageCount         = Object.keys(projectOutputs).length;
  const featureStageCount         = activeFeature ? Object.keys(currentFeatureOutputs).length : 0;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

        {/* PROJECT STRATEGY */}
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
            onRun={() => {}}
          />
        ))}

        {/* FEATURE SPEC */}
        <div style={{ borderTop: "2px dashed #e0e0e0", margin: "28px 0 24px" }} />

        {activeFeature ? (
          <div>
            <SectionHeader
              icon="⚙️"
              title={activeFeature.name + " — Feature Spec"}
              subtitle="Constraints above are automatically applied to every stage."
              color="#00AA44"
              count={featureStageCount}
            />

            <ContextInput
              value={activeFeature.description}
              color="#00AA44"
              label="Feature Context"
              hint="Describe this feature — scope, user problem, non-goals, any relevant technical notes."
              placeholder="What is this feature? Who uses it, what problem does it solve, what is explicitly out of scope? Add any technical constraints or design decisions already made."
              minRows={3}
              onSave={(desc) => updateFeature(activeFeature.id, activeFeature.name, desc)}
            />

            {constraints.length > 0 && (
              <div style={{ marginBottom: 16, padding: "9px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#888", display: "flex", gap: 8, alignItems: "center" }}>
                <span>🔒</span>
                <span>{constraints.length} project constraint{constraints.length > 1 ? "s" : ""} active — <strong style={{ color: "#FF8800" }}>{constraints.filter(c => c.severity === "Must").length} Must, {constraints.filter(c => c.severity === "Should").length} Should</strong>. All stages will respect these.</span>
              </div>
            )}

            {FEATURE_STAGES.map(stage => (
              <StageCard
                key={activeFeature.id + "-" + stage.id}
                stage={stage}
                result={currentFeatureOutputs[stage.id] !== undefined ? currentFeatureOutputs[stage.id] : null}
                loading={false}
                descriptionMissing={featureDescriptionMissing}
                interviewEndpoint={API + "/features/" + activeFeature.id + "/interview/" + stage.id}
                runEndpoint={API + "/features/" + activeFeature.id + "/run/" + stage.id}
                onResult={(result) => saveFeatureOutput(activeFeature.id, stage.id, result)}
                onRun={() => {}}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#999", marginBottom: 6 }}>No feature selected</div>
            <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.6 }}>Select a feature from the sidebar or click <strong>"+ Add Feature"</strong>.</div>
          </div>
        )}
      </div>
    </div>
  );
}