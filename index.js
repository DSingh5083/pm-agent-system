import "dotenv/config";
import { runPipeline } from "./agents/orchestrator.js";

// 👇 Change this to your feature idea
const featureIdea = "Add a waitlist feature so users can sign up before launch";

const results = await runPipeline(featureIdea);

console.log("\n" + "=".repeat(60));
console.log("📄 PRD:\n", results.prd);
console.log("\n" + "=".repeat(60));
console.log("🔍 REVIEW NOTES:\n", results.reviewNotes);
console.log("\n" + "=".repeat(60));
console.log("🎫 TICKETS:\n", JSON.stringify(results.tickets, null, 2));
console.log("\n" + "=".repeat(60));
console.log("📢 STAKEHOLDER UPDATE:\n", results.update);