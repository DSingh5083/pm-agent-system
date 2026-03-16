export const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const CONSTRAINT_TYPES = ["Compliance", "Security", "Legal", "Operational", "Technical", "Accessibility", "Performance", "Other"];
export const SEVERITY_COLORS  = { Must: "#FF4444", Should: "#FF8800", "Nice to have": "#00AA44" };

export const PROJECT_STAGES = [
  { id: "competitor",      level: "project", icon: "🌐", label: "Competitor Intel",      color: "#FF8800", description: "Deep research · recent moves · gaps to exploit",        model: "gemini", useWebSearch: true },
  { id: "market_analysis", level: "project", icon: "📊", label: "Market Analysis",        color: "#0066FF", description: "Market size · trends · target segments · growth signals", model: "gemini", useWebSearch: true },
  { id: "roadmap",         level: "project", icon: "🗺️", label: "Product Roadmap",        color: "#8B00FF", description: "Phased delivery plan · milestones · dependencies" },
  { id: "gtm",             level: "project", icon: "🚀", label: "Go To Market",            color: "#FF4444", description: "Launch strategy · positioning · channels · pricing" },
];

export const FEATURE_STAGES = [
  { id: "prd",          level: "feature", icon: "📄", label: "PRD",                   color: "#0066FF", description: "Full product requirements document" },
  { id: "architecture", level: "feature", icon: "🏗️", label: "Technical Architecture", color: "#0099AA", description: "System design · data models · API contracts" },
  { id: "flow",         level: "feature", icon: "🔀", label: "High Level Flow",        color: "#AA00AA", description: "User journeys · system interactions" },
  { id: "ui_spec",      level: "feature", icon: "🎨", label: "UI Spec",                color: "#E91E8C", description: "Component breakdown · interactions · states" },
  { id: "diagram",      level: "feature", icon: "📐", label: "Visual Diagram",         color: "#2E7D32", description: "Mermaid diagrams · architecture visuals", renderer: "mermaid" },
  { id: "review",       level: "feature", icon: "🔍", label: "Spec Review",            color: "#FF4444", description: "Constraint compliance · gap analysis · risks" },
  { id: "tickets",      level: "feature", icon: "🎫", label: "Tickets",                color: "#00AA44", description: "Dev-ready tickets with acceptance criteria", renderer: "tickets" },
];