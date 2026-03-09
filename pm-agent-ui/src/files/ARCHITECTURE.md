# PM Agent — Frontend Architecture

## Folder Structure

```
src/
├── App.jsx                        # Shell only. Nav + module switching.
│
├── modules/
│   ├── registry.js                # ← THE ONLY FILE TO EDIT when adding a module
│   ├── PMPipeline/
│   │   └── index.jsx
│   └── WritingEnhancer/
│       └── index.jsx
│
├── lib/
│   └── claude.js                  # All Claude/backend API calls live here
│
└── components/
    └── ui.jsx                     # Shared UI primitives (Button, Card, etc.)
```

---

## How to Add a New Module

**3 steps. Nothing else breaks.**

### Step 1 — Create your module
```
src/modules/YourModule/index.jsx
```

```jsx
export default function YourModule() {
  return <div>Your feature here</div>;
}
```

### Step 2 — Register it
In `src/modules/registry.js`, add one entry:

```js
import YourModule from "./YourModule/index.jsx";

export const MODULES = [
  // ...existing modules...
  {
    id:          "your-module",
    label:       "Your Module",
    icon:        "🔧",
    description: "What it does",
    component:   YourModule,
  },
];
```

### Step 3 — Done
The nav tab, routing and layout all update automatically.

---

## Rules

| Layer | Rule |
|---|---|
| `App.jsx` | Never add business logic here |
| `registry.js` | Only file to touch when adding/removing modules |
| `lib/claude.js` | All API calls go here. Never fetch Claude directly in a module |
| `components/ui.jsx` | Add shared UI here. Never duplicate components across modules |
| `modules/*/index.jsx` | Self-contained. Only imports from `lib/` and `components/` |

---

## Adding a Backend Route

In `pm-agent-system/server.js`:
```js
app.post("/your-route", async (req, res) => {
  // your logic
  res.json({ result: "..." });
});
```

Then in your module, call it via the shared utility:
```js
import { callBackend } from "../../lib/claude.js";
const data = await callBackend("/your-route", { input: "..." });
```

---

## Planned Modules (ideas)
- Sprint Retro Generator
- Competitor Intelligence
- User Story Mapper
- OKR Builder
- Meeting Summarizer
