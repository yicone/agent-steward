#!/usr/bin/env tsx
/**
 * Script to find Codex conversations containing subagent events
 */

async function main() {
  const baseUrl = "http://localhost:3001";

  try {
    // Fetch conversation list
    console.log("Fetching Codex conversation list...");
    const convRes = await fetch(`${baseUrl}/api/conversations?source=codex&limit=1000`);
    if (!convRes.ok) {
      throw new Error(`Failed to fetch conversations: ${convRes.status}`);
    }

    const data = await convRes.json();
    const items = data.items ?? [];
    console.log(`✓ Found ${items.length} Codex conversations\n`);

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
        const trajRes = await fetch(`${baseUrl}/api/conversations/codex/${encodeURIComponent(id)}`);
        if (!trajRes.ok) {
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
        // skip
      }
    }

    // Report results
    console.log("\n" + "=".repeat(60));
    console.log(`Found ${subagentConversations.length} Codex conversations with subagent events:`);
    console.log("=".repeat(60));

    if (subagentConversations.length === 0) {
      console.log("\n❌ No Codex conversations found with subagent events.");
    } else {
      for (const conv of subagentConversations) {
        console.log(`\n📋 ${conv.title}`);
        console.log(`   ID: ${conv.id}`);
        console.log(`   Subagent events: ${conv.subagentCount}`);
        console.log(`   URL: ?source=codex&id=${encodeURIComponent(conv.id)}&view=trajectory`);
      }
    }

    console.log("\n" + "=".repeat(60));
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  }
}

main();
