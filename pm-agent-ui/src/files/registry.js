// ─────────────────────────────────────────────────────────────────────────────
// modules/registry.js
//
// THE ONLY FILE YOU TOUCH TO ADD A NEW MODULE.
//
// To add a new feature:
//   1. Create your component in src/modules/YourModule/index.jsx
//   2. Import it here and add one entry to MODULES
//   3. Done. Nav, routing, layout all update automatically.
// ─────────────────────────────────────────────────────────────────────────────

import PMPipeline      from "./PMPipeline/index.jsx";
import WritingEnhancer from "./WritingEnhancer/index.jsx";

export const MODULES = [
  {
    id:          "pipeline",
    label:       "PM Pipeline",
    icon:        "⚡",
    description: "PRD → Spec Review → Tickets → Roadmap",
    component:   PMPipeline,
  },
  {
    id:          "writing",
    label:       "Writing Enhancer",
    icon:        "✍️",
    description: "Polish emails, messages, and responses",
    component:   WritingEnhancer,
  },

  // ── ADD NEW MODULES BELOW THIS LINE ──────────────────────────────────────
  // {
  //   id:          "retro",
  //   label:       "Sprint Retro",
  //   icon:        "🔄",
  //   description: "Generate retro summaries from notes",
  //   component:   SprintRetro,
  // },
];
