// ─────────────────────────────────────────────────────────────────────────────
// modules/registry.js
// THE ONLY FILE YOU TOUCH TO ADD A NEW MODULE.
// ─────────────────────────────────────────────────────────────────────────────

import PMPipeline      from "./PMPipeline/index.jsx";
import WritingEnhancer from "./WritingEnhancer/index.jsx";
import PMChat          from "./PMChat/index.jsx";

export const MODULES = [
  {
    id:          "pipeline",
    label:       "PM Pipeline",
    icon:        "⚡",
    description: "Competitor intel → PRD → Architecture → Flow → Review → Tickets → Roadmap",
    component:   PMPipeline,
  },
  {
    id:          "chat",
    label:       "PM Assistant",
    icon:        "🧠",
    description: "Chat with your PM assistant — refine PRDs, comms, edge cases and more",
    component:   PMChat,
  },
  {
    id:          "writing",
    label:       "Writing Enhancer",
    icon:        "✍️",
    description: "Polish emails, messages, and stakeholder communications",
    component:   WritingEnhancer,
  },
];