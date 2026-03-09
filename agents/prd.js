import Anthropic from "@anthropic-ai/sdk";

import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runPRDAgent(featureIdea) {
  console.log("\n🧠 PRD Agent running...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a senior product manager. Write a detailed PRD for this feature:

"${featureIdea}"

Structure your PRD as follows:
1. Problem Description
2. Target Users
3. Precondition
4. User Stories (at least 3) with acceptance criteria
5. overall acceptance criteria
6. Functional Requirements
7. Edge Cases
8. Post Condition
9. Out of Scope

Be specific and thorough.`,
      },
    ],
  });

  return response.content[0].text;
}