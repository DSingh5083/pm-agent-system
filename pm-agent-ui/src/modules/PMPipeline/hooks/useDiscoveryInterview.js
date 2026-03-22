// hooks/useDiscoveryInterview.js
// Discovery interview question generation and answer submission logic.

import { useState, useEffect } from "react";
import { apiFetch, API } from "../../../lib/apiClient";  // adjust path depth

export function useDiscoveryInterview(project) {
  const [questions,  setQuestions]  = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!project?.id) return;
    setLoading(true);
    setError(null);
    apiFetch("/projects/" + project.id + "/discovery-interview", { method: "POST" })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setQuestions(d.questions || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [project?.id]);

  const setAnswer = (index, value) =>
    setAnswers(prev => ({ ...prev, [index]: value }));

  const submit = async (onComplete) => {
    if (!questions) return;
    setSubmitting(true);
    const answersText = questions
      .map((q, i) => `Q: ${q}\nA: ${answers[i] || "(skipped)"}`)
      .join("\n\n");
    const brief = `Discovery Interview Answers:\n\n${answersText}`;

    await apiFetch("/projects/" + project.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: project.name, description: brief }),
    });

    setSubmitting(false);
    onComplete(brief);
  };

  const hasAnyAnswer = questions?.some((_, i) => answers[i]?.trim());

  return { questions, answers, loading, submitting, error, hasAnyAnswer, setAnswer, submit };
}
