import { useState, useEffect } from "react";
import { API } from "../constants.js";

export default function InterviewModal({ stage, interviewEndpoint, runEndpoint, onComplete, onCancel }) {
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

