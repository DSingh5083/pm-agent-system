// ─────────────────────────────────────────────────────────────────────────────
// agents/competitor.js
//
// Uses Claude's built-in web_search tool to find real competitor insights.
// No third-party search API needed — Claude searches the web itself.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runCompetitorAnalysis(idea) {
  console.log("🔍 Competitor Agent running with web search...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
      },
    ],
    messages: [
      {
        role: "user",
        content: `You are a product market research analyst. A product team is building the following feature:

FEATURE IDEA:
${idea}

Your job is to:
1. Search the web for the TOP 3-5 competitors or similar products that already offer this or related features
2. Find the LATEST market trends, user complaints, and gaps in existing solutions
3. Identify what competitors are doing well and where they fall short

Search for:
- Competitors offering similar features (search for product names, reviews, comparisons)
- Recent news or updates in this space (last 6-12 months)
- User complaints or feature requests on Reddit, G2, Capterra, or similar
- Market size or growth data if available

After searching, provide a structured competitor analysis with:

## Market Overview
[2-3 sentences on the market landscape and opportunity]

## Key Competitors
For each competitor:
**[Competitor Name]**
- What they offer in this space
- Their strengths
- Their weaknesses / gaps
- Pricing (if found)

## Market Gaps & Opportunities
[What competitors are missing that our feature could address]

## Latest Market Insights
[Recent news, trends, or signals from the last 6-12 months]

## Strategic Recommendations
[3-5 specific recommendations for how to position and differentiate this feature]

Be specific, use real product names, real data points where found, and cite sources where relevant.`,
      },
    ],
  });

  // Extract the final text response (after web search tool calls complete)
  const textBlocks = response.content.filter(block => block.type === "text");
  const result = textBlocks.map(b => b.text).join("\n");

  console.log("✅ Competitor Analysis Complete");
  return result;
}
