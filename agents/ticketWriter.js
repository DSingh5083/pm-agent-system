import Anthropic from "@anthropic-ai/sdk";

import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runTicketWriterAgent(prd, reviewNotes) {
  console.log("\n🎫 Ticket Writer Agent running...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a product manager creating Jira tickets.

Based on this PRD and review notes, create development tickets.

PRD:
${prd}

Review Notes:
${reviewNotes}

Output a JSON array of tickets. Each ticket must have:
- title (string)
- description (string) as covered in the PRD
- acceptanceCriteria (array of strings)
- Effort in hours divided by dev, qa, BA time
- type (string: "story", "task", or "bug")

IMPORTANT: Return ONLY the JSON array. No markdown, no backticks, no explanation. Start your response with [ and end with ]`,
      },
    ],
  });

  const raw = response.content[0].text.trim();
  
  // 👇 safer parsing with better error message
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]") + 1;
    const jsonOnly = raw.slice(start, end);
    return JSON.parse(jsonOnly);
  } catch (err) {
    console.error("❌ Failed to parse tickets JSON. Raw response:\n", raw);
    throw err;
  }
}