// ─────────────────────────────────────────────────────────────────────────────
// agents/flow.js
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runFlow(idea) {
  console.log("🔀 Flow Agent running...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a senior product and engineering lead. Based on the following feature, produce a comprehensive high-level flow document.

FEATURE IDEA:
${idea}

Produce the following sections:

## Happy Path Flow
Step-by-step numbered flow of the main user journey from start to finish. Be specific about what the user does and what the system does at each step.

## System Interaction Flow
How the system components talk to each other internally. Show the sequence:
- Frontend → Backend
- Backend → Database
- Backend → External services
- Async processes / queues

## Edge Cases & Alternate Flows
List every edge case and what happens:
- What triggers it
- How the system handles it
- What the user sees

## Error Handling Flow
- Network failures
- Validation errors
- Third-party service failures
- Timeout scenarios

## State Transitions
Key states the feature moves through (e.g. for an order: draft → confirmed → processing → complete → cancelled). For each state:
- What triggers the transition
- What happens in the system
- What the user sees

## Notifications & Side Effects
Any emails, push notifications, webhooks, audit logs, or other side effects triggered at each step.

Be thorough. A developer should be able to build this from your flow without needing to ask questions.`,
      },
    ],
  });

  console.log("✅ Flow Complete");
  return response.content[0].text;
}
