// hooks/useSemanticSort.js
// All Semantic Sort AI logic. Import into SemanticSort component.
// No JSX — pure logic hook.

import { useState } from "react";
import { API } from "../constants.js";

export function useSemanticSort({ onApprove }) {
  const [step,                 setStep]                 = useState("input");
  const [rawInput,             setRawInput]             = useState("");
  const [buckets,              setBuckets]              = useState({ pain: [], feature: [], constraint: [], vibe: [] });
  const [enhancements,         setEnhancements]         = useState([]);
  const [googleSearchInsights, setGoogleSearchInsights] = useState([]);
  const [productCategory,      setProductCategory]      = useState("");
  const [searchStatus,         setSearchStatus]         = useState("");
  const [error,                setError]                = useState(null);

  const sort = async () => {
    if (!rawInput.trim()) return;
    setStep("sorting");
    setError(null);
    try {
      const res  = await fetch(API + "/semantic-sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: rawInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBuckets(data.buckets);
      setStep("review");
      runBackgroundResearch(data.buckets);
    } catch (e) {
      setError("Sort failed: " + e.message);
      setStep("input");
    }
  };

  const runBackgroundResearch = async (b) => {
    const painText = (b.pain || []).join(". ");
    if (!painText) return;
    setSearchStatus("Researching enhancements...");
    try {
      const res  = await fetch(API + "/semantic-enhancements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buckets: b }),
      });
      const data = await res.json();
      if (!data.error) {
        setEnhancements(data.enhancements || []);
        setGoogleSearchInsights(data.googleSearchInsights || []);
        setProductCategory(data.productCategory || "");
      }
    } catch {}
    finally { setSearchStatus(""); }
  };

  const moveItem = (fromKey, toKey, item) => {
    setBuckets(prev => ({
      ...prev,
      [fromKey]: prev[fromKey].filter(i => i !== item),
      [toKey]:   [...(prev[toKey] || []), item],
    }));
  };

  const removeItem = (bucketKey, item) => {
    setBuckets(prev => ({
      ...prev,
      [bucketKey]: prev[bucketKey].filter(i => i !== item),
    }));
  };

  const approve = async () => {
    setStep("generating");
    setError(null);
    try {
      const res  = await fetch(API + "/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buckets, enhancements, googleSearchInsights }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onApprove(data.brief);
    } catch (e) {
      setError("Brief generation failed: " + e.message);
      setStep("review");
    }
  };

  return {
    step, rawInput, setRawInput,
    buckets, enhancements, googleSearchInsights, productCategory,
    searchStatus, error,
    sort, moveItem, removeItem, approve,
  };
}
