import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runRoadmapAgent(featureIdea, tickets) {
  console.log("\n🗺 Roadmap Agent running...");

  const totalPoints = tickets.reduce((s, t) => s + t.storyPoints, 0);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a senior product manager creating a sprint roadmap.

Feature: "${featureIdea}"
Total tickets: ${tickets.length}
Total story points: ${totalPoints}
Tickets:
${tickets.map((t) => `- [${t.storyPoints}pt] ${t.title} (${t.type})`).join("\n")}

Create a realistic sprint-by-sprint roadmap. Assume 20 story points per sprint (2 weeks).

For each sprint provide:
- Sprint number and date range (starting from next Monday)
- Sprint goal (one sentence)
- Which tickets are included
- Key milestone or deliverable

End with a summary of total timeline and key risks to hitting the date.`,
      },
    ],
  });

  return response.content[0].text;
}