// StageCard/renderers.jsx
// Content renderers: text, tickets, mermaid diagrams.
// Kept separate from StageCard logic to stay under 200 lines.

import { useEffect, useRef } from "react";

export function SectionedText({ content, color }) {
  const sections = content.split(/\n##\s+/).filter(Boolean);
  if (sections.length <= 1) {
    return (
      <pre style={{ fontSize: 13, color: "#333", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", margin: 0 }}>
        {content}
      </pre>
    );
  }
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
            <pre style={{ padding: "12px 14px", fontSize: 13, color: "#333", lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", margin: 0 }}>
              {body}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

export function TicketList({ tickets }) {
  const typeColor = { feature: "#0066FF", bug: "#FF4444", chore: "#888" };
  const totalPts  = tickets.reduce((s, t) => s + (t.storyPoints || 0), 0);
  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { l: "Tickets",  v: tickets.length,                                    c: "#0066FF" },
          { l: "Points",   v: totalPts,                                           c: "#8B00FF" },
          { l: "Features", v: tickets.filter(t => t.type === "feature").length,  c: "#00AA44" },
          { l: "Chores",   v: tickets.filter(t => t.type === "chore").length,    c: "#888"    },
        ].map(({ l, v, c }) => (
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
                    <span style={{ color: "#00AA44", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{ac}</span>
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

export function MermaidDiagram({ content }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !content) return;
    const render = async () => {
      try {
        if (!window.mermaid) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
          window.mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        }
        ref.current.innerHTML = "";
        const id  = "mermaid-" + Date.now();
        const { svg } = await window.mermaid.render(id, content);
        ref.current.innerHTML = svg;
      } catch (e) {
        ref.current.innerHTML = `<pre style="color:#FF4444;font-size:12px">${e.message}</pre>`;
      }
    };
    render();
  }, [content]);
  return <div ref={ref} style={{ overflowX: "auto" }} />;
}
