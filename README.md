# ⚡ PM Nucleus System

An AI-powered product management pipeline that takes you from a raw idea to code-ready engineering specs. Built with Claude, Gemini, and Google Search — deployed on Vercel (frontend) + Render (backend).

---

## What it does

PM Agent replaces the manual, scattered PM workflow with a structured AI pipeline. You describe your product once — the agent handles the rest.

```
Raw idea → Discovery Interview → Project Brief → Strategy Stages
                                                      ↓
                                              Feature Spec → Code-Ready PRD
                                                                    ↓
                                                          Code-Ready Stories → Tickets → Notion
```

---

## Modules

### ⚡ Pipeline (Project Strategy)
Runs once per product. Each stage builds on the last.

| Stage | Model | What it does |
|-------|-------|--------------|
| 🌐 Competitor Intel | Gemini 2.0 Flash + Google Search | Live competitive analysis, recent moves, market gaps |
| 📊 Market Analysis | Gemini 2.0 Flash + Google Search | TAM/SAM/SOM, trends, target segments, buying behaviour |
| 🗺️ Product Roadmap | Claude Sonnet | Phased delivery plan, milestones, dependencies |
| 🚀 Go To Market | Claude Sonnet | Launch strategy, positioning, channels, pricing |

### ⚙️ Features (Per-Feature Specs)
Runs per feature. Inherits full project context automatically.

| Stage | What it does |
|-------|--------------|
| 📄 PRD | Full product requirements — editable live doc |
| 🔧 Code-Ready PRD | Component-to-logic mapping, API contracts, state machine, edge cases, implementation plan. Upload UI screenshots for accuracy |
| 📋 Code-Ready Stories | 3 atomic user stories with data model, API handshake, acceptance criteria, edge cases |
| 🏗️ Technical Architecture | System design, data models, API contracts |
| 🔀 High Level Flow | User journeys, system interactions, edge cases |
| 🎨 UI Spec | Screen inventory, components, interactions |
| 📐 Visual Diagram | Mermaid diagrams rendered visually |
| 🔍 Spec Review | Constraint compliance, gap analysis, risks |
| 🎫 Tickets | Jira-ready dev tickets with acceptance criteria |

### Assistant
Context-aware PM chat. Knows your full project — every stage output, every constraint. Runs a Discovery Interview before generating anything. Detects "Research this: [topic]" and runs a live Google search.

###  Writing
Powered by Gemini 2.0 Flash.
- **Enhance Writing** — 3 tone variations (Professional, Executive, Friendly, Assertive, Diplomatic)
- **Stakeholder Translator** — rewrites the same message for CEO, Tech Lead, BA, Designer, or Operations

### 📄 Docs
Rovo-style document generation grounded in project context. Generates status updates, retrospectives, kickoff plans, onboarding guides. Editable in-app, downloadable as `.docx`.

---

## Key Features

**🧠 Senior Product Architect Agent**
Every stage runs with a shared system prompt: JTBD framework for all user stories, TL;DR required at the top of every output, Friction Check (3 failure risks) at the bottom of every feature spec, no invented statistics.

**🔍 Semantic Sort**
Dump raw unstructured notes → AI categorises into User Pain, Feature Ideas, Tech Constraints, and Vibe/Goals → background Google Search finds relevant tools and 2025–2026 trend articles → generates a structured project brief in one click.

**🎤 Discovery Interview**
When you create a new project, the agent asks 3–5 pointed non-obvious questions before any stages run. Also triggers in chat when you describe a new idea.

**✦ Improve with AI**
In the Project Brief, paste rough notes → click Improve → see a before/after diff → accept or keep original.

**🔒 Constraints System**
Add compliance, security, legal, operational, or technical constraints at the project level. They're automatically injected into every feature stage prompt with Must/Should/Nice-to-have severity.

**📋 Push to Notion**
Every stage card has a "📋 Notion" button. Creates or updates a Notion page in your linked database. Tracks project, feature, stage, status, and last synced timestamp. Full version history via Notion's built-in versioning.

**✏️ Inline Editing**
Every stage output is editable directly in the card. Edit → Save persists back to the database via upsert.

**🔄 Interview Step**
Before each stage runs, the agent reads your full context and asks 3–5 clarifying questions specific to what's missing — not generic questions. Answers are distilled into a structured briefing that improves output quality.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| AI — Core | Claude Sonnet 4 (Anthropic) |
| AI — Research | Gemini 2.0 Flash (Google) |
| AI — Writing | Gemini 2.0 Flash (Google) |
| Search | Google Programmable Search Engine |
| Diagrams | Mermaid.js |
| Docs Export | docx |
| Integrations | Notion API |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Project Structure

```
pm-agent-system/
├── server.js                          # Express backend
├── db.js                              # PostgreSQL schema + queries
├── stageRegistry.js                   # Single source of truth for all stages
├── agents/
│   └── stageRunner.js                 # Routes stages to Claude or Gemini
├── docs/
│   └── features/                      # Generated PRD markdown files
└── pm-agent-ui/
    └── src/
        ├── App.jsx                    # Top-level layout + routing
        ├── lib/
        │   ├── useProject.js          # Project/feature/output state
        │   └── claude.js              # Claude API client
        ├── modules/
        │   ├── PMPipeline/            # Project strategy pipeline
        │   │   ├── PMPipelineContext.jsx
        │   │   ├── ProjectView/       # Brief, constraints, project stages
        │   │   ├── FeatureView/       # Feature description + stages
        │   │   ├── StageCard/         # Stage card + inline editor + Notion push
        │   │   ├── shared/            # SemanticSort, DiscoveryInterview, InterviewModal
        │   │   └── hooks/             # useSemanticSort, useImproveWithAI, useDiscoveryInterview
        │   ├── Features/              # Dedicated feature tab
        │   │   ├── index.jsx
        │   │   ├── CodeReadyPRD.jsx   # Screenshot upload + technical PRD generation
        │   │   └── CodeReadyStories.jsx
        │   ├── PMChat/                # AI assistant
        │   ├── WritingEnhancer/       # Writing + stakeholder translator
        │   └── Docs/                  # Document generation + .docx export
        └── components/
            └── ui.jsx
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (via [Postgres.app](https://postgresapp.com) on Mac)
- API keys (see below)

### API Keys Required

| Key | Where to get it | Used for |
|-----|----------------|----------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | All Claude stages |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | Competitor Intel, Market Analysis, Writing |
| `GOOGLE_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) → Custom Search API | Google PSE search |
| `GOOGLE_PSE_CX` | [programmablesearchengine.google.com](https://programmablesearchengine.google.com) | Search engine ID |
| `NOTION_API_KEY` | [notion.so/my-integrations](https://www.notion.so/my-integrations) | Push to Notion |
| `NOTION_DATABASE_ID` | From your Notion database URL | Target database |

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/pm-agent-system.git
cd pm-agent-system

# 2. Install backend dependencies
npm install

# 3. Create local database
createdb pm_agent

# 4. Create .env file in root
cp .env.example .env
# Fill in your API keys

# 5. Start the backend
node server.js

# 6. In a new terminal — install and start the frontend
cd pm-agent-ui
npm install
npm run dev

# 7. Open http://localhost:5173
```

### Notion Database Setup

Create a Notion database with these exact properties:

| Property | Type |
|----------|------|
| Name | Title |
| Project | Text |
| Feature | Text |
| Stage | Select |
| Status | Select (Draft / Review / Approved) |
| Last Synced | Date |

Share the database with your integration via the **Share** button → search for your integration name → Invite.

---

## Deployment

### Frontend → Vercel
1. Import repo on [vercel.com](https://vercel.com)
2. Set Root Directory to `pm-agent-ui`
3. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com`
4. Deploy

### Backend → Render
1. New Web Service on [render.com](https://render.com)
2. Connect GitHub repo, root directory `/`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add PostgreSQL database → copy Internal Database URL
6. Add all environment variables
7. Deploy

---

## Agent Rules

Every stage runs with these constraints baked into the system prompt:

- **JTBD Framework** — all user stories follow: "When [situation], I want to [motivation], so I can [outcome]"
- **TL;DR Required** — every PRD and feature spec starts with a 2–3 sentence executive summary
- **Friction Check** — every feature output ends with 3 failure risks: Technical Debt, UX Friction, Low Adoption
- **No invented data** — market share percentages, statistics, and pricing must come from search results or be flagged as [Unverified]
- **Cite sources** — all external claims include [Source URL]
- **Skeptical by default** — the agent challenges vague goals and pushes back on weak assumptions

---

## Architectural Rules

```
src/modules/PMPipeline/
├── PMPipelineContext.jsx     # Single context provider — no prop drilling
├── [Domain]View/             # Grouped by domain
├── shared/                   # Shared UI components
└── hooks/                    # All AI logic lives here, not in components
```

- Components over 200 lines must be refactored
- AI calls (Semantic Sort, interviews, improve) live in custom hooks
- `stageRegistry.js` is the single source of truth — adding a stage never requires touching the UI

---

## License

MIT
