#!/usr/bin/env tsx
/**
 * Script to find Antigravity conversations containing subagent events.
 * 
 * This script uses the web app's API to search for subagent events across all Antigravity conversations.
 * 
 * Usage: npx tsx scripts/find-subagent-conversations.ts
 */

async function main() {
  console.log("Searching for Antigravity conversations with subagent events...\n");

  const baseUrl = "http://localhost:3001";

  try {
    // Fetch conversation list
    console.log("Fetching conversation list...");
    const convRes = await fetch(`${baseUrl}/api/conversations?source=antigravity&limit=1000`);
    if (!convRes.ok) {
      throw new Error(`Failed to fetch conversations: ${convRes.status}`);
    }

    const data = await convRes.json();
    const items = data.items ?? [];
    console.log(`✓ Found ${items.length} Antigravity conversations\n`);

    const subagentConversations: Array<{
      id: string;
      title?: string;
      subagentCount: number;
    }> = [];

    // Search each conversation for subagent events
    for (const conv of items) {
      const id = conv.id;
      const title = conv.title ?? id;

      try {
        const trajRes = await fetch(`${baseUrl}/api/conversations/antigravity/${encodeURIComponent(id)}`);
        if (!trajRes.ok) {
          console.warn(`  ⚠ Failed to fetch trajectory for ${id}`);
          continue;
        }

        const trajData = await trajRes.json();
        const events = trajData.events ?? [];

        // Count subagent events
        const subagentCount = events.filter((e: any) => e.kind === "subagent").length;

        if (subagentCount > 0) {
          subagentConversations.push({
            id,
            title,
            subagentCount
          });
        }
      } catch (e) {
        console.warn(`  ⚠ Error fetching trajectory for ${id}: ${e}`);
      }
    }

    // Report results
    console.log("\n" + "=".repeat(60));
    console.log(`Found ${subagentConversations.length} conversations with subagent events:`);
    console.log("=".repeat(60));

    if (subagentConversations.length === 0) {
      console.log("\n❌ No conversations found with subagent events.");
      console.log("\nPossible reasons:");
      console.log("  1. The conversations you checked don't use browser subagent features");
      console.log("  2. Antigravity may use different step type names for subagents");
      console.log("  3. Subagent events may be in conversations you haven't checked yet");
      console.log("\nSuggested next steps:");
      console.log("  - Try conversations that involve web browsing or external tools");
      console.log("  - Check if Antigravity has newer step types for subagents");
      console.log("  - Verify the dev server is running: pnpm dev");
    } else {
      for (const conv of subagentConversations) {
        console.log(`\n📋 ${conv.title}`);
        console.log(`   ID: ${conv.id}`);
        console.log(`   Subagent events: ${conv.subagentCount}`);
      }
    }

    console.log("\n" + "=".repeat(60));
  } catch (e) {
    console.error("❌ Error:", e);
    console.error("\nPlease ensure the dev server is running: pnpm dev");
    process.exit(1);
  }
}

main();
