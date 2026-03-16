import { useState } from "react";
import { CONSTRAINT_TYPES, SEVERITY_COLORS } from "../constants.js";

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

export default function ConstraintsPanel({ constraints, onAdd, onUpdate, onDelete }) {
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
