import { useState, useEffect, useRef } from "react";


// ── Feature Description — structured coder-ready form ────────────────────────
// Stored as JSON, serialised into a rich prompt block for every stage

const FEATURE_FIELDS = [
  {
    key:         "what",
    label:       "What it does",
    required:    true,
    wide:        true,
    rows:        2,
    placeholder: "Describe the feature in plain terms. What does it do? What does the user see and interact with?",
  },
  {
    key:         "why",
    label:       "Why we're building it",
    required:    true,
    wide:        true,
    rows:        2,
    placeholder: "What user problem or business need does this solve? What happens today without it?",
  },
  {
    key:         "scope",
    label:       "In scope",
    required:    false,
    wide:        false,
    rows:        3,
    placeholder: "List every screen, action, and data operation being built. Be specific.",
  },
  {
    key:         "outOfScope",
    label:       "Out of scope",
    required:    false,
    wide:        false,
    rows:        3,
    placeholder: "What are we explicitly NOT building in this iteration?",
  },
  {
    key:         "techNotes",
    label:       "Technical notes",
    required:    false,
    wide:        true,
    rows:        2,
    placeholder: "Existing APIs to use, DB tables involved, third-party services, known constraints, auth rules, performance targets.",
  },
];

function parseFeatureDesc(raw) {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && (p.what || p.why)) return p;
  } catch {}
  // Legacy plain text — put it in "what"
  return { what: raw };
}

function serialiseFeatureDesc(obj) {
  // Also produce a flat text representation for the prompt
  const lines = [];
  if (obj.what)       lines.push("WHAT: " + obj.what);
  if (obj.why)        lines.push("WHY: " + obj.why);
  if (obj.scope)      lines.push("IN SCOPE:\n" + obj.scope);
  if (obj.outOfScope) lines.push("OUT OF SCOPE:\n" + obj.outOfScope);
  if (obj.techNotes)  lines.push("TECHNICAL NOTES:\n" + obj.techNotes);
  return JSON.stringify({ ...obj, _text: lines.join("\n\n") });
}

export default function FeatureDescriptionInput({ value, onSave }) {
  const [fields,    setFields]    = useState(() => parseFeatureDesc(value));
  const [saving,    setSaving]    = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef                  = useRef(null);

  useEffect(() => { setFields(parseFeatureDesc(value)); }, [value]);

  const saveFields = async (updated) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      await onSave(serialiseFeatureDesc(updated));
      setSaving(false);
      setLastSaved(new Date());
    }, 600);
  };

  const update = (key, val) => {
    const updated = { ...fields, [key]: val };
    setFields(updated);
    saveFields(updated);
  };

  const filled  = FEATURE_FIELDS.filter(f => fields[f.key]?.trim()).length;
  const isReady = FEATURE_FIELDS.filter(f => f.required).every(f => fields[f.key]?.trim());

  const fieldBase = {
    width: "100%", padding: "8px 11px", borderRadius: 8,
    border: "1.5px solid #e8e8e8", fontSize: 13, fontFamily: "inherit",
    color: "#1a1a2a", outline: "none", boxSizing: "border-box",
    background: "#fafafa", lineHeight: 1.7, resize: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ marginBottom: 20, background: "#fff", border: "1.5px solid #00AA4422", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,170,68,0.05)" }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", background: "#00AA4406", borderBottom: "1px solid #00AA4412", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a" }}>Feature Spec</div>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: isReady ? "#00AA44" : "#FF8800", background: isReady ? "#00AA4412" : "#FF880012", padding: "1px 7px", borderRadius: 10 }}>
            {filled}/{FEATURE_FIELDS.length} filled
          </span>
          {!isReady && <span style={{ fontSize: 11, color: "#FF8800" }}>Fill What + Why to unlock stages</span>}
        </div>
        <div style={{ fontSize: 11, color: "#bbb", fontFamily: "monospace" }}>
          {saving ? "saving..." : lastSaved ? "auto-saved ✓" : "auto-saves as you type"}
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {FEATURE_FIELDS.map(f => (
          <div key={f.key} style={{ gridColumn: f.wide ? "1 / -1" : "auto" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              {f.label}
              {f.required && <span style={{ color: "#FF4444", fontSize: 10 }}>*</span>}
            </label>
            <textarea
              value={fields[f.key] || ""}
              onChange={e => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={f.rows}
              style={{ ...fieldBase, borderColor: fields[f.key]?.trim() ? "#00AA4433" : "#e8e8e8" }}
              onFocus={e => e.target.style.borderColor = "#00AA44"}
              onBlur={e => e.target.style.borderColor = fields[f.key]?.trim() ? "#00AA4433" : "#e8e8e8"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Constraint form - defined at module level so React never remounts it on keystroke

function ConstraintForm({ form, setForm, onSubmit, onCancel, label }) {
