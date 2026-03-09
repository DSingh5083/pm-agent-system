import Anthropic from "@anthropic-ai/sdk";

import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runStakeholderAgent(featureIdea, tickets) {
  console.log("\n📢 Stakeholder Update Agent running...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are a product manager writing a stakeholder update.

Feature being built: "${featureIdea}"
Number of tickets created: ${tickets.length}
Ticket titles: ${tickets.map((t) => t.title).join(", ")}

Write a concise message (max 150 words) announcing this feature is going into development. Include what it does, why it matters, and expected scope and timeline.`,
      },
    ],
  });

  return response.content[0].text;
}