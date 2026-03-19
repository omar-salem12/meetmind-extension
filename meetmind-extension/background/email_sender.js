// ─── MeetMind Email Sender ────────────────────────────────────────────────────
// Sends action item digests via the Gmail MCP server.
// Loaded by background service worker when the user clicks "Email digest to me".
// ──────────────────────────────────────────────────────────────────────────────

const GMAIL_MCP_URL = "https://gmail.mcp.claude.com/mcp";

/**
 * Sends an action item digest email for a given meeting + actions list.
 * Uses the Anthropic API with the Gmail MCP server to compose and send.
 *
 * @param {Object} opts
 * @param {string}   opts.recipientEmail  - User's Gmail address
 * @param {Object}   opts.meeting         - Meeting object { title, date, duration, attendees }
 * @param {string}   opts.summary         - AI-generated summary text
 * @param {string[]} opts.decisions       - Array of decision strings
 * @param {Object[]} opts.actions         - Array of { text, owner, priority }
 * @param {string}   opts.nextSteps       - Next steps text
 */
async function sendDigestEmail({ recipientEmail, meeting, summary, decisions, actions, nextSteps }) {
  const prompt = buildEmailPrompt({ recipientEmail, meeting, summary, decisions, actions, nextSteps });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are MeetMind's email delivery agent. Use the Gmail MCP tool to send a meeting digest email.
Always call send_email exactly once with the provided details. Do not ask for confirmation.`,
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [
        {
          type: "url",
          url: GMAIL_MCP_URL,
          name: "gmail-mcp"
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Email API failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const toolResult = data.content?.find(b => b.type === "mcp_tool_result");
  return { ok: true, result: toolResult };
}

function buildEmailPrompt({ recipientEmail, meeting, summary, decisions, actions, nextSteps }) {
  const actionList = actions.map((a, i) =>
    `${i + 1}. ${a.text} (Owner: ${a.owner}, Priority: ${a.priority || 'medium'})`
  ).join('\n');

  const decisionList = decisions.map((d, i) => `${i + 1}. ${d}`).join('\n');

  const htmlBody = buildEmailHTML({ meeting, summary, decisions, actions, nextSteps });

  return `Send a meeting digest email with the following details:

To: ${recipientEmail}
Subject: MeetMind: Action items from "${meeting.title}"

Meeting: ${meeting.title}
Date: ${meeting.date}
Duration: ${meeting.duration}
Attendees: ${(meeting.attendees || []).join(', ')}

Summary:
${summary}

Key Decisions:
${decisionList}

Action Items:
${actionList}

Next Steps:
${nextSteps}

Please send this as a nicely formatted HTML email using the Gmail MCP send_email tool.
HTML body:
${htmlBody}`;
}

function buildEmailHTML({ meeting, summary, decisions, actions, nextSteps }) {
  const decisionRows = decisions.map(d =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f5;font-size:13px;">• ${d}</td></tr>`
  ).join('');

  const actionRows = actions.map(a => `
    <tr>
      <td style="padding:10px;font-size:13px;">${a.text}</td>
      <td style="padding:10px;"><span style="background:rgba(167,139,250,.12);color:#7c3aed;border-radius:999px;padding:2px 10px;font-size:11px;">@${a.owner}</span></td>
    </tr>`).join('');

  return `
<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
  <div style="background:linear-gradient(135deg,#0d0f14,#1e2430);border-radius:14px 14px 0 0;padding:24px 28px;">
    <div style="font-size:22px;font-weight:800;color:#e8eaf0;">◈ MeetMind</div>
    <div style="font-size:12px;color:#7a8199;margin-top:3px;">Your AI meeting digest</div>
  </div>
  <div style="background:#fff;padding:24px 28px;">
    <h2 style="font-size:18px;color:#1a1a2e;margin-bottom:4px;">${meeting.title}</h2>
    <p style="font-size:12px;color:#7a8199;margin-bottom:20px;">📅 ${meeting.date} · ⏱ ${meeting.duration}</p>
    <p style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5b8eff;margin-bottom:8px;">Summary</p>
    <div style="background:#f8f9ff;border-left:3px solid #5b8eff;padding:12px 14px;border-radius:0 8px 8px 0;font-size:13px;line-height:1.7;margin-bottom:20px;">${summary}</div>
    <p style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5b8eff;margin-bottom:8px;">Key Decisions</p>
    <table style="width:100%;margin-bottom:20px;">${decisionRows}</table>
    <p style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5b8eff;margin-bottom:8px;">Action Items</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#f8f9ff;">
        <th style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#7a8199;padding:6px 10px;text-align:left;">Task</th>
        <th style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#7a8199;padding:6px 10px;text-align:left;">Owner</th>
      </tr>
      ${actionRows}
    </table>
    <p style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5b8eff;margin-bottom:8px;">Next Steps</p>
    <div style="background:rgba(91,142,255,.05);border:1px solid rgba(91,142,255,.15);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.6;">${nextSteps}</div>
  </div>
  <div style="background:#f4f4f8;border-radius:0 0 14px 14px;padding:14px 28px;text-align:center;font-size:11px;color:#7a8199;">
    Generated by MeetMind · Powered by Airia agent pipeline
  </div>
</div>`;
}

// Export for use in service_worker.js
if (typeof module !== 'undefined') module.exports = { sendDigestEmail };
