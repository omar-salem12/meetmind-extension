#!/usr/bin/env node
// ─── MeetMind · Airia Community Publisher ─────────────────────────────────────
// Run this script to publish the MeetMind agent to the Airia Community.
// Usage: node publish_to_airia.js --key YOUR_AIRIA_API_KEY
//
// Prerequisites:
//   npm install node-fetch form-data
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const AIRIA_COMMUNITY_API = "https://api.airia.com/v1/community/agents";

// Parse CLI args
const args = process.argv.slice(2);
const keyIdx = args.indexOf('--key');
const AIRIA_KEY = keyIdx !== -1 ? args[keyIdx + 1] : process.env.AIRIA_API_KEY;

if (!AIRIA_KEY) {
  console.error('❌ Missing Airia API key. Pass --key YOUR_KEY or set AIRIA_API_KEY env var.');
  process.exit(1);
}

const agentConfig = {
  name: "MeetMind – Meeting Intelligence Agent",
  version: "1.0.0",
  description: "A Track 1 Airia Everywhere browser extension that connects to Google Calendar and Gmail to automatically generate AI-powered meeting notes, extract action items, and deliver digests — all without leaving your workflow.",
  category: "Productivity",
  tags: ["meetings", "calendar", "notes", "browser-extension", "track-1", "airia-everywhere", "google-calendar", "gmail"],
  track: "track-1-airia-everywhere",
  source_url: "https://github.com/your-username/meetmind-extension",
  demo_video_url: "",  // Add your Loom/YouTube URL here before submitting
  icon_emoji: "◈",
  integrations: [
    { name: "Google Calendar", type: "mcp", server: "gcal.mcp.claude.com" },
    { name: "Gmail", type: "mcp", server: "gmail.mcp.claude.com" }
  ],
  agent_yaml_path: path.join(__dirname, "../agent-config/airia_agent.yaml")
};

async function publish() {
  console.log("◈ MeetMind · Airia Community Publisher");
  console.log("─".repeat(50));

  // Read the agent YAML
  let agentYaml;
  try {
    agentYaml = fs.readFileSync(agentConfig.agent_yaml_path, 'utf8');
    console.log("✓ Loaded agent YAML");
  } catch (e) {
    console.error("✗ Could not read agent YAML:", e.message);
    process.exit(1);
  }

  console.log("⟳ Publishing to Airia Community…");

  try {
    const fetch = (await import('node-fetch')).default;
    const resp = await fetch(AIRIA_COMMUNITY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIRIA_KEY}`,
        'X-Airia-Hackathon': 'airia-2025'
      },
      body: JSON.stringify({
        ...agentConfig,
        agent_definition: agentYaml
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      console.log("✓ Published successfully!");
      console.log("  Agent ID:", data.id);
      console.log("  Community URL:", data.community_url);
      console.log("  Status:", data.status);
    } else {
      const err = await resp.text();
      console.error(`✗ Publish failed (${resp.status}):`, err);
      console.log("\nManual publish steps:");
      printManualSteps();
    }
  } catch (e) {
    console.log("ℹ Could not reach Airia API (may need active account).");
    console.log("  Use the manual steps below to publish:\n");
    printManualSteps();
  }
}

function printManualSteps() {
  console.log("  1. Go to https://explore.airia.com");
  console.log("  2. Sign in → Agent Library → Publish Agent");
  console.log("  3. Upload: agent-config/airia_agent.yaml");
  console.log("  4. Fill in:");
  console.log("     Name:        " + agentConfig.name);
  console.log("     Category:    " + agentConfig.category);
  console.log("     Tags:        " + agentConfig.tags.join(', '));
  console.log("     Source URL:  " + agentConfig.source_url);
  console.log("  5. Submit for review");
  console.log("  6. Copy the agent community URL and add it to your Devpost submission");
}

publish();
