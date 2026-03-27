// modules/Monitor/index.jsx
// Token usage monitoring + LangSmith trace view.
// Shows: summary stats, tokens-over-time chart, per-stage breakdown, recent runs table.

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/apiClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + "k";
  return String(n);
}

function formatCost(n) {
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(3);
}

function formatMs(ms) {
  if (!ms) return "—";
  if (ms >= 60000) return (ms / 60000).toFixed(1) + "m";
  if (ms >= 1000)  return (ms / 1000).toFixed(1)  + "s";
  return ms + "ms";
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "#0066FF", alert }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}20`, borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${color}`, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: alert ? "#FF4444" : color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Token timeline chart (SVG) ────────────────────────────────────────────────

function TokenChart({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 13 }}>
        No data yet — run some stages to see token usage over time
      </div>
    );
  }

  const W = 700, H = 140, PAD = { top: 10, right: 20, bottom: 30, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxTokens = Math.max(...timeline.map(t => t.tokens), 1);
  const points    = timeline.map((t, i) => ({
    x: PAD.left + (i / Math.max(timeline.length - 1, 1)) * chartW,
    y: PAD.top  + chartH - (t.tokens / maxTokens) * chartH,
    ...t,
  }));

  const pathD  = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillD  = `${pathD} L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`;

  // Y axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y:     PAD.top + chartH - f * chartH,
    label: formatTokens(Math.round(f * maxTokens)),
  }));

  // X axis labels — show first, middle, last
  const xLabels = [0, Math.floor(timeline.length / 2), timeline.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i && v < timeline.length)
    .map(i => ({
      x:     points[i].x,
      label: new Date(timeline[i].time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {/* Grid lines */}
      {yLabels.map((l, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={l.y} x2={PAD.left + chartW} y2={l.y} stroke="#f0f0f0" strokeWidth={1} />
          <text x={PAD.left - 6} y={l.y + 4} textAnchor="end" fontSize={9} fill="#bbb">{l.label}</text>
        </g>
      ))}

      {/* Error spikes — red vertical lines */}
      {points.filter(p => p.errors > 0).map((p, i) => (
        <line key={i} x1={p.x} y1={PAD.top} x2={p.x} y2={PAD.top + chartH} stroke="#FF444440" strokeWidth={2} strokeDasharray="3,2" />
      ))}

      {/* Fill */}
      <path d={fillD} fill="#0066FF10" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#0066FF" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={p.errors > 0 ? "#FF4444" : "#0066FF"} />
      ))}

      {/* X axis labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4} textAnchor="middle" fontSize={9} fill="#bbb">{l.label}</text>
      ))}
    </svg>
  );
}

// ── Stage breakdown table ─────────────────────────────────────────────────────

function StageBreakdown({ byStage }) {
  if (!byStage || byStage.length === 0) return null;

  const sorted = [...byStage].sort((a, b) => b.tokens - a.tokens);

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2a", marginBottom: 10 }}>Token Usage by Stage</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f5f6f8" }}>
            {["Stage", "Runs", "Total Tokens", "Avg Tokens", "Errors", "Cost"].map(h => (
              <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, color: "#555", borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f5f5f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ padding: "7px 12px", fontWeight: 600, color: "#1a1a2a" }}>{s.label}</td>
              <td style={{ padding: "7px 12px", color: "#555" }}>{s.runs}</td>
              <td style={{ padding: "7px 12px", color: s.tokens > 50000 ? "#FF8800" : "#555", fontWeight: s.tokens > 50000 ? 700 : 400 }}>{formatTokens(s.tokens)}</td>
              <td style={{ padding: "7px 12px", color: "#555" }}>{s.runs ? formatTokens(Math.round(s.tokens / s.runs)) : "—"}</td>
              <td style={{ padding: "7px 12px", color: s.errors > 0 ? "#FF4444" : "#aaa", fontWeight: s.errors > 0 ? 700 : 400 }}>{s.errors || "—"}</td>
              <td style={{ padding: "7px 12px", color: "#555" }}>{formatCost(s.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Run trace row ─────────────────────────────────────────────────────────────

function TraceRow({ run, onSelect, selected }) {
  const isError       = run.isError;
  const isRateLimit   = run.errorType === "rate_limit";
  const isHighTokens  = run.totalTokens > 50000;

  return (
    <tr
      onClick={() => onSelect(run)}
      style={{ borderBottom: "1px solid #f5f5f5", background: selected ? "#0066FF08" : isError ? "#FF444405" : "transparent", cursor: "pointer" }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#f9f9fb"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = isError ? "#FF444405" : "transparent"; }}
    >
      <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 10, color: "#aaa" }}>{timeAgo(run.startTime)}</td>
      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a1a2a", fontSize: 12 }}>{run.stageLabel}</td>
      <td style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>{run.projectName}</td>
      <td style={{ padding: "8px 12px", fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{run.model?.replace("claude-sonnet-4-", "sonnet-").replace("-20250514", "")}</td>
      <td style={{ padding: "8px 12px", fontSize: 12, color: isHighTokens ? "#FF8800" : "#555", fontWeight: isHighTokens ? 700 : 400 }}>
        {formatTokens(run.totalTokens)}
        {isHighTokens && <span style={{ marginLeft: 4, fontSize: 9, color: "#FF8800" }}>⚠️ high</span>}
      </td>
      <td style={{ padding: "8px 12px", fontSize: 11, color: "#aaa" }}>{formatMs(run.latencyMs)}</td>
      <td style={{ padding: "8px 12px" }}>
        {isRateLimit
          ? <span style={{ fontSize: 10, color: "#FF4444", background: "#FF444411", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>429</span>
          : isError
          ? <span style={{ fontSize: 10, color: "#FF4444", background: "#FF444411", padding: "2px 7px", borderRadius: 10 }}>error</span>
          : <span style={{ fontSize: 10, color: "#00AA44", background: "#00AA4411", padding: "2px 7px", borderRadius: 10 }}>ok</span>
        }
      </td>
    </tr>
  );
}

// ── Trace detail panel ────────────────────────────────────────────────────────

function TraceDetail({ run, onClose }) {
  if (!run) return null;

  const rows = [
    ["Stage",         run.stageLabel],
    ["Stage ID",      run.stageId],
    ["Model",         run.model],
    ["Project",       run.projectName],
    ["Feature",       run.featureName || "—"],
    ["Input tokens",  run.inputTokens?.toLocaleString()],
    ["Output tokens", run.outputTokens?.toLocaleString()],
    ["Total tokens",  run.totalTokens?.toLocaleString()],
    ["Cost",          formatCost(run.costUsd || 0)],
    ["Latency",       formatMs(run.latencyMs)],
    ["Status",        run.isError ? (run.errorType === "rate_limit" ? "429 Rate Limit" : "Error") : "Success"],
    ["Run ID",        run.id],
  ];

  return (
    <div style={{ width: 340, background: "#fff", borderLeft: "1px solid #e8e8e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>Trace Detail</div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "#aaa", cursor: "pointer", padding: 0 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
        {run.totalTokens > 50000 && (
          <div style={{ marginBottom: 14, padding: "10px 12px", background: "#FF880010", border: "1px solid #FF880030", borderRadius: 8, fontSize: 12, color: "#FF8800" }}>
            ⚠️ <strong>High token usage</strong> — {formatTokens(run.totalTokens)} tokens. Consider chunking context for this stage.
          </div>
        )}
        {run.isError && (
          <div style={{ marginBottom: 14, padding: "10px 12px", background: "#FF444410", border: "1px solid #FF444430", borderRadius: 8, fontSize: 12, color: "#FF4444" }}>
            {run.errorType === "rate_limit"
              ? "⚡ Rate limit hit — this run contributed to a 429 error. Check the timeline for the spike."
              : `❌ Error: ${run.errorMessage || "Unknown error"}`}
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "7px 0", fontSize: 11, color: "#aaa", width: 110, fontWeight: 600 }}>{label}</td>
                <td style={{ padding: "7px 0", fontSize: 12, color: "#333", wordBreak: "break-all", fontFamily: label === "Run ID" ? "monospace" : "inherit" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16 }}>
          <a
            href={`https://smith.langchain.com/public/${run.id}/r`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#0066FF", textDecoration: "none", padding: "7px 14px", border: "1px solid #0066FF30", borderRadius: 8, background: "#0066FF08" }}
          >
            View in LangSmith ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Monitor module ───────────────────────────────────────────────────────

export default function Monitor() {
  const [stats,         setStats]         = useState(null);
  const [runs,          setRuns]          = useState([]);
  const [selectedRun,   setSelectedRun]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [autoRefresh,   setAutoRefresh]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, runsRes] = await Promise.all([
        apiFetch("/monitor/stats"),
        apiFetch("/monitor/runs?limit=50"),
      ]);
      const statsData = await statsRes.json();
      const runsData  = await runsRes.json();
      if (statsData.error) throw new Error(statsData.error);
      if (runsData.error)  throw new Error(runsData.error);
      setStats(statsData);
      setRuns(runsData.runs || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (error?.includes("LANGCHAIN_API_KEY")) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#f5f6f8" }}>
        <div style={{ maxWidth: 480, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2a", marginBottom: 8 }}>LangSmith not configured</div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 20 }}>
            Add your LangSmith API key to Render environment variables to enable monitoring.
          </div>
          <div style={{ background: "#f5f6f8", borderRadius: 8, padding: "12px 16px", textAlign: "left", fontSize: 12, fontFamily: "monospace", color: "#555", lineHeight: 2 }}>
            LANGCHAIN_API_KEY=ls__...<br />
            LANGCHAIN_PROJECT=pm-agent-system<br />
            LANGCHAIN_TRACING_V2=true
          </div>
          <div style={{ marginTop: 16 }}>
            <a href="https://smith.langchain.com" target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: "#0066FF", textDecoration: "none" }}>
              Create LangSmith account ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", overflow: "hidden", background: "#f5f6f8" }}>

      {/* Header */}
      <div style={{ padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a" }}>Monitor</div>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {lastRefresh ? `Last updated ${timeAgo(lastRefresh)}` : "Loading..."}
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666", cursor: "pointer" }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          Auto-refresh (30s)
        </label>
        <button onClick={fetchData} disabled={loading}
          style={{ padding: "6px 14px", background: loading ? "#e8e8e8" : "#0066FF", border: "none", borderRadius: 8, color: loading ? "#aaa" : "#fff", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {error && !error.includes("LANGCHAIN_API_KEY") && (
        <div style={{ margin: "12px 24px", padding: "10px 14px", background: "#FF444410", border: "1px solid #FF444430", borderRadius: 8, fontSize: 12, color: "#FF4444" }}>
          ❌ {error}
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Summary stats */}
          {stats && (
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <StatCard label="Total Runs"    value={stats.summary.totalRuns}                color="#0066FF" />
              <StatCard label="Total Tokens"  value={formatTokens(stats.summary.totalTokens)} color="#8B00FF" />
              <StatCard label="Total Cost"    value={formatCost(stats.summary.totalCost)}      color="#00AA44" />
              <StatCard label="Avg Latency"   value={formatMs(stats.summary.avgLatency)}       color="#00AACC" />
              <StatCard label="Rate Limit Hits" value={stats.summary.rateLimitHits} color="#FF8800" alert={stats.summary.rateLimitHits > 0} sub={stats.summary.rateLimitHits > 0 ? "Check timeline for spikes" : "None"} />
              <StatCard label="Error Rate"    value={stats.summary.totalRuns ? `${Math.round((stats.summary.errorRuns / stats.summary.totalRuns) * 100)}%` : "—"} color="#FF4444" alert={stats.summary.errorRuns > 0} />
            </div>
          )}

          {/* Token timeline chart */}
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>Tokens Over Time</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Red dots = errors · Dashed lines = rate limit spikes</div>
              </div>
            </div>
            <TokenChart timeline={stats?.timeline} />
          </div>

          {/* Stage breakdown */}
          {stats?.byStage?.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
              <StageBreakdown byStage={stats.byStage} />
            </div>
          )}

          {/* Recent runs table */}
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2a" }}>Recent Runs</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Click a row to see trace detail</div>
            </div>
            {runs.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "#ccc" }}>
                {loading ? "Loading runs..." : "No runs yet — run some pipeline stages to see traces here"}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f5f6f8" }}>
                      {["Time", "Stage", "Project", "Model", "Tokens", "Latency", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#555", borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(run => (
                      <TraceRow key={run.id} run={run} onSelect={setSelectedRun} selected={selectedRun?.id === run.id} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Trace detail panel */}
        {selectedRun && <TraceDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
      </div>
    </div>
  );
}
