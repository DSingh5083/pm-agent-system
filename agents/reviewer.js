import Anthropic from "@anthropic-ai/sdk";

import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runReviewerAgent(prd) {
  console.log("\n🔍 Spec Reviewer Agent running...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a senior engineer reviewing a PRD before development starts.

Review this PRD and identify:
1. Missing edge cases
2. Ambiguous requirements
3. Missing acceptance criteria
4. Potential technical risks
5. Questions devs will likely ask
6. think thorough about the whole problem

PRD:
${prd}

Be direct and specific. Format as a numbered list.`,
      },
    ],
  });

  return response.content[0].text;
}