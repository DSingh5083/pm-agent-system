// ─────────────────────────────────────────────────────────────────────────────
// agents/architecture.js
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runArchitecture(idea) {
  console.log("🏗️ Architecture Agent running...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a senior software architect. Based on the following feature idea, produce a detailed technical architecture document.

FEATURE IDEA:
${idea}

Produce the following sections:

## System Components
List every component involved (frontend, backend, services, databases, queues, third-party APIs). For each:
- Component name
- Responsibility
- Technology recommendation

## Data Models
Key entities and their fields. Show relationships between them.

## API Design
Key API endpoints needed. For each:
- Method + path
- Request payload
- Response shape
- Auth requirements

## Architecture Decisions
3-5 key architectural decisions with:
- The decision
- Why this approach
- Trade-offs considered

## Scalability Considerations
- Expected load patterns
- Bottlenecks to watch
- How to scale each component

## Security Considerations
- Auth & authorization approach
- Data sensitivity
- Key risks and mitigations

## Tech Stack Recommendation
Recommended stack with justification for each choice. Flag anything that needs further discussion with the team.

Be specific and practical. Assume a modern web stack unless the feature implies otherwise.`,
      },
    ],
  });

  console.log("✅ Architecture Complete");
  return response.content[0].text;
}
