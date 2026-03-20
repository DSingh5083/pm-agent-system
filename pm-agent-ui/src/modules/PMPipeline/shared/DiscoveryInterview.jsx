import { useState, useEffect } from "react";
import { apiFetch, API } from "../../../lib/api";  // adjust path depth

export default function DiscoveryInterviewModal({ project, onClose, onComplete }) {
  const [questions,  setQuestions]  = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch( "/projects/" + project.id + "/discovery-interview", { method: "POST" })
      .then(r => r.json())
      .then(d => { setQuestions(d.questions || []); setLoading(false); })
      .catch(() => { setLoading(false); onClose(); });
  }, [project.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    // Build answers into a brief and save to project description
    const answersText = questions.map((q, i) =>
      `Q: ${q}\nA: ${answers[i] || "(skipped)"}`
    ).join("\n\n");
    const brief = `Discovery Interview Answers:\n\n${answersText}`;
    await apiFetch("/projects/" + project.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: project.name, description: brief }),
    });
    setSubmitting(false);
    onComplete(brief);
  };

  const allAnswered = questions && questions.some((_, i) => answers[i]?.trim());

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.65)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #f0f0f0", background: "linear-gradient(135deg, #1a1a2a, #0066FF22)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🔍 Discovery Interview</div>
          <div style={{ fontSize: 12, color: "#ffffff88" }}>
            Before any stages run — {project.name}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#ffffff55", lineHeight: 1.6, fontStyle: "italic" }}>
            "Do not write the brief immediately. Ask pointed, non-obvious questions to clarify the Why, User Pain, and Technical Constraints."
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#aaa", fontSize: 13 }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 16 }}>✦</span>
              Generating discovery questions...
            </div>
          )}

          {questions && questions.map((q, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a", marginBottom: 8, display: "flex", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#0066FF", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                {q}
              </div>
              <textarea
                value={answers[i] || ""}
                onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                placeholder="Your answer..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1a1a2a", lineHeight: 1.7, border: "1.5px solid #e0e0e0", borderRadius: 8, outline: "none", resize: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "#0066FF"}
                onBlur={e => e.target.style.borderColor = "#e0e0e0"}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, color: "#888", fontSize: 13, cursor: "pointer" }}>
            Skip for now
          </button>
          <button onClick={handleSubmit} disabled={!allAnswered || submitting || loading}
            style={{ padding: "8px 24px", background: !allAnswered || submitting || loading ? "#e8e8e8" : "#0066FF", border: "none", borderRadius: 8, color: !allAnswered || submitting || loading ? "#aaa" : "#fff", fontSize: 13, fontWeight: 700, cursor: !allAnswered || submitting || loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {submitting ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span> Saving...</> : "Save & Start Building →"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
