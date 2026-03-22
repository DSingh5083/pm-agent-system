// hooks/useImproveWithAI.js
// Handles the "Improve with AI" brief rewriting flow.
// Returns state and handlers — no JSX.

import { useState } from "react";
import { apiFetch, API } from "../../../lib/apiClient";  // adjust path depth

export function useImproveWithAI() {
  const [improving, setImproving] = useState(false);
  const [preview,   setPreview]   = useState(null); // { original, improved }
  const [error,     setError]     = useState(null);

  const improve = async (draft) => {
    if (!draft?.trim() || improving) return;
    setImproving(true);
    setError(null);
    try {
      const res  = await apiFetch("/improve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: draft }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview({ original: draft, improved: data.improved });
    } catch (e) {
      setError("Improve failed: " + e.message);
    } finally {
      setImproving(false);
    }
  };

  const accept  = () => preview?.improved;
  const dismiss = () => setPreview(null);

  return { improving, preview, error, improve, accept, dismiss };
}
