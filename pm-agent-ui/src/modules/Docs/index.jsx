import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch, API } from "../../../lib/api";

// Starter prompts shown when no project context yet
const STARTER_PROMPTS = [
  { icon: "🤝", label: "Status Update",    prompt: "Write a project status update summarising key accomplishments, current priorities, and blockers for my stakeholders." },
  { icon: "📊", label: "Retrospective",    prompt: "Create a retrospective doc with sections for: what went well, what could be improved, action items, and shoutouts." },
  { icon: "📝", label: "Onboarding Guide", prompt: "Build an onboarding guide for a new team member joining this project. Include a welcome note, a getting-started checklist, key contacts, and links to important resources." },
  { icon: "🎯", label: "Project Kickoff",  prompt: "Turn this project into a clear kickoff plan. Include goals, success metrics, timeline, team roles, key risks, and first-week priorities." },
  { icon: "🗒️", label: "Meeting Notes",    prompt: "Create a structured meeting notes template with sections for attendees, agenda, decisions made, action items with owners, and next meeting date." },
  { icon: "⚠️", label: "Risk Register",    prompt: "Create a risk register for this project. For each risk include: description, likelihood, impact, severity score, mitigation plan, and owner." },
];

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(md, onCheckboxToggle) {
  if (!md) return null;
  const lines = md.split("\n");
  const elements = [];
  let i = 0;
  let key = 0;

  const nextKey = () => ++key;

  function inlineFormat(text) {
    const parts = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[2]) parts.push(<strong key={nextKey()}>{m[2]}</strong>);
      else if (m[3]) parts.push(<em key={nextKey()}>{m[3]}</em>);
      else if (m[4]) parts.push(<code key={nextKey()} style={{ fontFamily: "monospace", fontSize: "0.9em", background: "#f0f0f0", padding: "1px 5px", borderRadius: 4, color: "#c7254e" }}>{m[4]}</code>);
      else if (m[5]) parts.push(<a key={nextKey()} href={m[6]} target="_blank" rel="noreferrer" style={{ color: "#0066FF", textDecoration: "underline" }}>{m[5]}</a>);
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : parts;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^# (.+)/.test(line)) {
      const text = line.replace(/^# /, "");
      elements.push(
        <h1 key={nextKey()} style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2a", margin: "28px 0 8px", paddingBottom: 8, borderBottom: "2px solid #e8e8e8", lineHeight: 1.3 }}>
          {inlineFormat(text)}
        </h1>
      );
      i++; continue;
    }

    if (/^## (.+)/.test(line)) {
      const text = line.replace(/^## /, "");
      elements.push(
        <h2 key={nextKey()} style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2a", margin: "22px 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 4, height: 18, background: "#0066FF", borderRadius: 2, flexShrink: 0, display: "inline-block" }} />
          {inlineFormat(text)}
        </h2>
      );
      i++; continue;
    }

    if (/^### (.+)/.test(line)) {
      const text = line.replace(/^### /, "");
      elements.push(
        <h3 key={nextKey()} style={{ fontSize: 12, fontWeight: 700, color: "#888", margin: "16px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {inlineFormat(text)}
        </h3>
      );
      i++; continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={nextKey()} style={{ border: "none", borderTop: "1px solid #e8e8e8", margin: "16px 0" }} />);
      i++; continue;
    }

    if (/^\|.+\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(l => !/^\|[-:| ]+\|$/.test(l.trim()));
      if (rows.length > 0) {
        const parseRow = (r) => r.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        const headers = parseRow(rows[0]);
        const body    = rows.slice(1);
        elements.push(
          <div key={nextKey()} style={{ overflowX: "auto", margin: "12px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f6f8" }}>
                  {headers.map((h, j) => (
                    <th key={j} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#333", borderBottom: "2px solid #e0e0e0", whiteSpace: "nowrap" }}>{inlineFormat(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid #f0f0f0", background: ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} style={{ padding: "7px 12px", color: "#444", verticalAlign: "top" }}>{inlineFormat(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (/^- \[[ x]\]/.test(line)) {
      const checkItems = [];
      while (i < lines.length && /^- \[[ x]\]/.test(lines[i])) {
        const checked = /^- \[x\]/.test(lines[i]);
        const text    = lines[i].replace(/^- \[[ x]\] /, "");
        checkItems.push({ checked, text, lineIdx: i });
        i++;
      }
      elements.push(
        <div key={nextKey()} style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: 5 }}>
          {checkItems.map((item, j) => (
            <label key={j} style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer", padding: "5px 8px", borderRadius: 6, background: item.checked ? "#00AA4408" : "transparent" }}>
              <input type="checkbox" defaultChecked={item.checked} onChange={e => onCheckboxToggle && onCheckboxToggle(item.lineIdx, e.target.checked)}
                style={{ marginTop: 2, accentColor: "#00AA44", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: item.checked ? "#aaa" : "#333", textDecoration: item.checked ? "line-through" : "none", lineHeight: 1.6 }}>
                {inlineFormat(item.text)}
              </span>
            </label>
          ))}
        </div>
      );
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].replace(/^[-*] /, "")); i++; }
      elements.push(
        <ul key={nextKey()} style={{ margin: "6px 0", padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item, j) => <li key={j} style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>{inlineFormat(item)}</li>)}
        </ul>
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, "")); i++; }
      elements.push(
        <ol key={nextKey()} style={{ margin: "6px 0", padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item, j) => <li key={j} style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>{inlineFormat(item)}</li>)}
        </ol>
      );
      continue;
    }

    if (/^```/.test(line)) {
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(
        <pre key={nextKey()} style={{ background: "#1a1a2a", color: "#e8e8e8", padding: "14px 18px", borderRadius: 8, fontSize: 12, fontFamily: "monospace", overflow: "auto", margin: "10px 0", lineHeight: 1.7 }}>
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    if (/^> /.test(line)) {
      const qLines = [];
      while (i < lines.length && /^> /.test(lines[i])) { qLines.push(lines[i].replace(/^> /, "")); i++; }
      elements.push(
        <blockquote key={nextKey()} style={{ borderLeft: "4px solid #0066FF", margin: "10px 0", padding: "8px 16px", background: "#0066FF06", borderRadius: "0 8px 8px 0" }}>
          {qLines.map((l, j) => <p key={j} style={{ margin: 0, fontSize: 13, color: "#555", fontStyle: "italic", lineHeight: 1.7 }}>{inlineFormat(l)}</p>)}
        </blockquote>
      );
      continue;
    }

    if (!line.trim()) { elements.push(<div key={nextKey()} style={{ height: 6 }} />); i++; continue; }

    elements.push(<p key={nextKey()} style={{ margin: "2px 0", fontSize: 13, color: "#444", lineHeight: 1.8 }}>{inlineFormat(line)}</p>);
    i++;
  }

  return elements;
}

// ── Doc viewer ────────────────────────────────────────────────────────────────

function DocViewer({ doc, onSave, onDelete, onNew }) {
  const [editMode, setEditMode]   = useState(false);
  const [title, setTitle]         = useState(doc.title);
  const [content, setContent]     = useState(doc.content);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [exporting, setExporting] = useState(false);
  const textareaRef               = useRef(null);

  useEffect(() => { setTitle(doc.title); setContent(doc.content); setEditMode(false); }, [doc.id]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(doc.id, title, content);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditMode(false);
  };

  const handleCheckboxToggle = useCallback((lineIdx, checked) => {
    setContent(prev => {
      const lines = prev.split("\n");
      if (lines[lineIdx]) lines[lineIdx] = lines[lineIdx].replace(/^(- \[)[ x](\])/, `$1${checked ? "x" : " "}$2`);
      return lines.join("\n");
    });
  }, []);

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const res = await apiFetch("/docs/" + doc.id + "/export-docx", { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      <div style={{ padding: "12px 28px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10, background: "#fafafa", flexShrink: 0 }}>
        {editMode ? (
          <input value={title} onChange={e => setTitle(e.target.value)}
            style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1a2a", border: "1.5px solid #0066FF", borderRadius: 6, padding: "4px 10px", fontFamily: "inherit", outline: "none" }} />
        ) : (
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1a2a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        )}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {editMode ? (
            <>
              <button onClick={() => { setTitle(doc.title); setContent(doc.content); setEditMode(false); }}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, background: "#f5f6f8", border: "1px solid #e0e0e0", color: "#888", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: saving ? "#ccc" : "#0066FF", border: "none", color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              {saved && <span style={{ fontSize: 11, color: "#00AA44", fontFamily: "monospace" }}>Saved</span>}
              <button onClick={() => setEditMode(true)}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, background: "#f5f6f8", border: "1px solid #e0e0e0", color: "#555", cursor: "pointer" }}>Edit</button>
              <button onClick={handleExportDocx} disabled={exporting}
                style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#1a1a2a", border: "none", color: "#fff", cursor: exporting ? "not-allowed" : "pointer" }}>
                {exporting ? "Exporting..." : "⬇ Download .docx"}
              </button>
              <button onClick={() => { if (confirm("Delete this doc?")) onDelete(doc.id); }}
                style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, background: "none", border: "1px solid #FF444422", color: "#FF4444", cursor: "pointer" }}>Delete</button>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {editMode ? (
          <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
            style={{ width: "100%", height: "100%", padding: "32px 48px", fontSize: 13, fontFamily: "monospace", color: "#333", lineHeight: 1.8, border: "none", outline: "none", resize: "none", boxSizing: "border-box", background: "#fff" }} />
        ) : (
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 48px" }}>
            {renderMarkdown(content, (lineIdx, checked) => {
              handleCheckboxToggle(lineIdx, checked);
              const updated = content.split("\n");
              if (updated[lineIdx]) {
                updated[lineIdx] = updated[lineIdx].replace(/^(- \[)[ x](\])/, `$1${checked ? "x" : " "}$2`);
                onSave(doc.id, title, updated.join("\n"));
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prompt input ──────────────────────────────────────────────────────────────

function PromptInput({ onGenerate, generating, activeProject, activeFeature }) {
  const [prompt, setPrompt] = useState("");
  const textareaRef         = useRef(null);

  const submit = () => { if (!prompt.trim() || generating) return; onGenerate(prompt.trim()); setPrompt(""); };
  const useStarter = (p) => { setPrompt(p); textareaRef.current?.focus(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f5f6f8" }}>
      <div style={{ padding: "32px 48px 0", maxWidth: 780, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2a", marginBottom: 6 }}>New Document</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 28 }}>
          {activeProject
            ? <>Context loaded from <strong style={{ color: "#0066FF" }}>{activeProject.name}</strong>{activeFeature ? <> / <strong style={{ color: "#00AA44" }}>{activeFeature.name}</strong></> : ""}</>
            : "Select a project to include its context in the document"}
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
          onFocusCapture={e => e.currentTarget.style.borderColor = "#0066FF"}
          onBlurCapture={e => e.currentTarget.style.borderColor = "#e0e0e0"}>
          <textarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder="Describe the document you want to create..." rows={4}
            style={{ width: "100%", padding: "18px 20px", fontSize: 14, fontFamily: "inherit", color: "#1a1a2a", lineHeight: 1.7, border: "none", outline: "none", resize: "none", boxSizing: "border-box", background: "transparent" }} />
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
            <span style={{ fontSize: 11, color: "#ccc" }}>⌘ + Enter to generate</span>
            <button onClick={submit} disabled={!prompt.trim() || generating || !activeProject}
              style={{ padding: "8px 22px", background: !prompt.trim() || generating || !activeProject ? "#e8e8e8" : "linear-gradient(135deg, #0044cccc, #0066FF)", border: "none", borderRadius: 8, color: !prompt.trim() || generating || !activeProject ? "#aaa" : "#fff", fontSize: 13, fontWeight: 700, cursor: !prompt.trim() || generating || !activeProject ? "not-allowed" : "pointer" }}>
              {generating ? "Generating..." : "Generate Doc ↗"}
            </button>
          </div>
        </div>
        {!activeProject && (
          <div style={{ marginTop: 10, padding: "9px 14px", background: "#FF880008", border: "1px solid #FF880022", borderRadius: 8, fontSize: 12, color: "#FF8800" }}>
            Select a project from the sidebar first — the doc will be grounded in your project context.
          </div>
        )}
      </div>
      <div style={{ padding: "28px 48px", maxWidth: 780, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 11, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 14 }}>Start with a template</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {STARTER_PROMPTS.map((s, i) => (
            <button key={i} onClick={() => useStarter(s.prompt)}
              style={{ padding: "12px 14px", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#0066FF44"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,102,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8e8"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>{s.prompt.slice(0, 80)}...</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Generating spinner ────────────────────────────────────────────────────────

function GeneratingView({ prompt }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f5f6f8", padding: 40 }}>
      <div style={{ fontSize: 40 }}>📄</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2a" }}>Generating document{dots}</div>
      <div style={{ fontSize: 13, color: "#aaa", maxWidth: 400, textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>"{prompt}"</div>
      <div style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>Reading project context and writing your document</div>
    </div>
  );
}

// ── Main module ───────────────────────────────────────────────────────────────

export default function Docs({ ps }) {
  const { activeProject, activeFeature } = ps;

  const [docs, setDocs]                         = useState([]);
  const [activeDoc, setActiveDoc]               = useState(null);
  const [generating, setGenerating]             = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState("");
  const [view, setView]                         = useState("new");
  const [loadingDocs, setLoadingDocs]           = useState(false);

  useEffect(() => {
    if (!activeProject) { setDocs([]); setActiveDoc(null); setView("new"); return; }
    setLoadingDocs(true);
    apiFetch("/projects/" + activeProject.id + "/docs")
      .then(r => r.json())
      .then(data => setDocs(data))
      .catch(console.error)
      .finally(() => setLoadingDocs(false));
  }, [activeProject?.id]);

  const handleGenerate = async (prompt) => {
    if (!activeProject) return;
    setGenerating(true);
    setGeneratingPrompt(prompt);
    setView("generating");
    try {
      const res = await apiFetch("/projects/" + activeProject.id + "/docs/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, featureId: activeFeature?.id }),
      });
      const doc = await res.json();
      if (doc.error) throw new Error(doc.error);
      setDocs(prev => [doc, ...prev]);
      setActiveDoc(doc);
      setView("doc");
    } catch (e) {
      alert("Generation failed: " + e.message);
      setView("new");
    } finally {
      setGenerating(false);
      setGeneratingPrompt("");
    }
  };

  const handleOpenDoc = async (docPreview) => {
    const res = await apiFetch("/docs/" + docPreview.id);
    const doc = await res.json();
    setActiveDoc(doc);
    setView("doc");
  };

  const handleSave = async (id, title, content) => {
    await apiFetch("/docs/" + id, {
      method: "PATCH",
      body: JSON.stringify({ title, content }),
    });
    setDocs(prev => prev.map(d => d.id === id ? { ...d, title } : d));
    if (activeDoc?.id === id) setActiveDoc(prev => ({ ...prev, title, content }));
  };

  const handleDelete = async (id) => {
    await apiFetch("/docs/" + id, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== id));
    setActiveDoc(null);
    setView("new");
  };

  function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>
      <div style={{ width: 240, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a" }}>Documents</div>
          <button onClick={() => { setActiveDoc(null); setView("new"); }}
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#0066FF", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ New</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {!activeProject && <div style={{ fontSize: 11, color: "#ccc", textAlign: "center", padding: "20px 12px", lineHeight: 1.7 }}>Select a project to see its documents</div>}
          {activeProject && loadingDocs && <div style={{ fontSize: 11, color: "#ccc", textAlign: "center", padding: 20 }}>Loading...</div>}
          {activeProject && !loadingDocs && docs.length === 0 && <div style={{ fontSize: 11, color: "#ccc", textAlign: "center", padding: "20px 12px", lineHeight: 1.7, fontStyle: "italic" }}>No documents yet. Generate your first one.</div>}
          {docs.map(doc => (
            <div key={doc.id} onClick={() => handleOpenDoc(doc)}
              style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 2, cursor: "pointer", background: activeDoc?.id === doc.id ? "#0066FF0d" : "transparent", border: `1px solid ${activeDoc?.id === doc.id ? "#0066FF22" : "transparent"}` }}
              onMouseEnter={e => { if (activeDoc?.id !== doc.id) e.currentTarget.style.background = "#f5f6f8"; }}
              onMouseLeave={e => { if (activeDoc?.id !== doc.id) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeDoc?.id === doc.id ? "#0066FF" : "#1a1a2a", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {doc.title}</div>
              {doc.preview && <div style={{ fontSize: 11, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.preview.replace(/[#*`>]/g, "").trim().slice(0, 60)}</div>}
              <div style={{ fontSize: 10, color: "#ccc", marginTop: 3, fontFamily: "monospace" }}>{timeAgo(doc.updated_at)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {view === "new"        && <div style={{ flex: 1, overflow: "auto" }}><PromptInput onGenerate={handleGenerate} generating={generating} activeProject={activeProject} activeFeature={activeFeature} /></div>}
        {view === "generating" && <GeneratingView prompt={generatingPrompt} />}
        {view === "doc"        && activeDoc && <DocViewer doc={activeDoc} onSave={handleSave} onDelete={handleDelete} onNew={() => { setActiveDoc(null); setView("new"); }} />}
      </div>
    </div>
  );
}