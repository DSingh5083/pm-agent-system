import { runPRDAgent } from "./prd.js";
import { runReviewerAgent } from "./reviewer.js";
import { runTicketWriterAgent } from "./ticketWriter.js";
import { runRoadmapAgent } from "./roadmap.js";

export async function runPipeline(featureIdea) {
  console.log(`\n🚀 Starting PM Pipeline for: "${featureIdea}"\n`);
  console.log("=".repeat(60));

  // Step 1: Generate PRD
  const prd = await runPRDAgent(featureIdea);
  console.log("\n✅ PRD Complete");

  // Step 2: Review the spec
  const reviewNotes = await runReviewerAgent(prd);
  console.log("\n✅ Spec Review Complete");

  // Step 3: Write tickets
  const tickets = await runTicketWriterAgent(prd, reviewNotes);
  console.log(`\n✅ ${tickets.length} Tickets Created`);

  // Step 4: Roadmap
  const roadmap = await runRoadmapAgent(featureIdea, tickets);
  console.log("\n✅ Roadmap Ready");

  return { prd, reviewNotes, tickets, roadmap };
}