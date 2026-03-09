// ─────────────────────────────────────────────────────────────────────────────
// components/ui.jsx
//
// Shared, reusable UI primitives.
// Import these in any module instead of re-writing them.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({ children, onClick, disabled, variant = "primary", fullWidth = false }) {
  const styles = {
    primary: {
      background: disabled ? "#e8e8e8" : "linear-gradient(135deg, #0066FF, #8B00FF)",
      color: disabled ? "#aaa" : "#fff",
      boxShadow: disabled ? "none" : "0 4px 16px rgba(0,102,255,0.25)",
    },
    secondary: {
      background: "#fff",
      color: "#555",
      boxShadow: "none",
      border: "1px solid #e0e0e0",
    },
    ghost: {
      background: "transparent",
      color: "#666",
      boxShadow: "none",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        width: fullWidth ? "100%" : "auto",
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

// ── TextArea ──────────────────────────────────────────────────────────────────

export function TextArea({ value, onChange, placeholder, rows = 4, label }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          {label}
        </div>
      )}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%", background: "#fff", border: "1px solid #e0e0e0",
          borderRadius: 10, padding: "12px 14px", color: "#1a1a2a", fontSize: 14,
          fontFamily: "inherit", lineHeight: 1.7, resize: "vertical",
          outline: "none", boxSizing: "border-box",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      />
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      marginTop: 12, padding: "10px 14px",
      background: "#FF444411", border: "1px solid #FF444433",
      borderRadius: 8, color: "#FF4444", fontSize: 13,
    }}>
      ❌ {message}
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: "#aaa", fontFamily: "monospace",
      textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, accent, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12,
      padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      borderLeft: accent ? `4px solid ${accent}` : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

export function CopyButton({ getText }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      padding: "5px 14px", borderRadius: 6, fontSize: 12,
      background: copied ? "#00AA4411" : "#f5f6f8",
      border: `1px solid ${copied ? "#00AA44" : "#e0e0e0"}`,
      color: copied ? "#00AA44" : "#666", cursor: "pointer",
      fontFamily: "monospace", transition: "all 0.2s",
    }}>
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle, loading, loadingText }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: "#ccc", gap: 12,
      border: "2px dashed #e8e8e8", borderRadius: 12,
      minHeight: 300,
    }}>
      <div style={{ fontSize: 40 }}>{loading ? "⏳" : icon}</div>
      <div style={{ fontSize: 14, color: "#bbb" }}>{loading ? (loadingText || "Loading...") : title}</div>
      {subtitle && !loading && <div style={{ fontSize: 12, color: "#ddd" }}>{subtitle}</div>}
    </div>
  );
}

// ── PillToggle ────────────────────────────────────────────────────────────────

export function PillToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            background: value === opt.id ? "#1a1a2a" : "#f5f6f8",
            color: value === opt.id ? "#fff" : "#555",
            border: `1px solid ${value === opt.id ? "#1a1a2a" : "#e0e0e0"}`,
            fontWeight: value === opt.id ? 600 : 400,
            transition: "all 0.15s",
          }}
        >
          {opt.icon && <span style={{ marginRight: 4 }}>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
