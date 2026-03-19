// ─── MeetMind Popup ────────────────────────────────────────────────────────────
// Track 1 – Airia Everywhere: Meeting notes & calendar intelligence
// Calls Anthropic API (acting as the Airia agent pipeline) to generate notes,
// summaries, and action items from Google Calendar events.
// ──────────────────────────────────────────────────────────────────────────────

const AIRIA_AGENT_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const statusPill   = $("statusPill");
const statusLabel  = $("statusLabel");
const screenAuth   = $("screenAuth");
const screenDash   = $("screenDash");
const meetingsList = $("meetingsList");
const notesList    = $("notesList");
const actionsList  = $("actionsList");
const noteOverlay  = $("noteOverlay");
const generateModal= $("generateModal");
const progressBar  = $("progressBar");
const modalStatus  = $("modalStatus");
const modalSteps   = $("modalSteps");

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  user: null,
  token: null,
  meetings: [],
  notes: [],     // { id, title, date, body }
  actions: [],   // { id, text, owner, done, meetingId }
  activeTab: "upcoming",
  isDemo: false
};

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  setStatus("connecting");
  const stored = await loadState();
  if (stored) {
    Object.assign(state, stored);
    if (state.user) showDash();
  } else {
    setStatus("idle", "Ready");
  }
})();

// ── Auth ──────────────────────────────────────────────────────────────────────
$("btnConnectGoogle").addEventListener("click", () => {
  // In a real extension: chrome.identity.getAuthToken({ interactive: true }, ...)
  // For demo/hackathon: simulate OAuth with a mock token
  mockGoogleSignIn();
});

$("btnDemo").addEventListener("click", () => {
  state.isDemo = true;
  loadDemoData();
  showDash();
});

$("btnLogout").addEventListener("click", () => {
  chrome?.storage?.local?.remove("meetmind_state");
  state = { user: null, token: null, meetings: [], notes: [], actions: [], activeTab: "upcoming", isDemo: false };
  screenDash.classList.add("hidden");
  screenAuth.classList.remove("hidden");
  setStatus("idle", "Ready");
});

function mockGoogleSignIn() {
  setStatus("connecting", "Signing in…");
  setTimeout(() => {
    state.user = { name: "Alex Mahmoud", email: "alex.mahmoud@example.com" };
    state.token = "mock_google_token_" + Date.now();
    loadDemoData();
    showDash();
    saveState();
  }, 1200);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function showDash() {
  screenAuth.classList.add("hidden");
  screenDash.classList.remove("hidden");

  const u = state.user;
  $("userName").textContent = u.name;
  $("userEmail").textContent = u.email;
  $("userAvatar").textContent = u.name[0].toUpperCase();

  setStatus("connected", "Connected");
  renderMeetings();
  renderNotes();
  renderActions();
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    state.activeTab = tab;
    $("tabUpcoming").classList.toggle("hidden", tab !== "upcoming");
    $("tabNotes").classList.toggle("hidden", tab !== "notes");
    $("tabActions").classList.toggle("hidden", tab !== "actions");
  });
});

// ── Meetings ──────────────────────────────────────────────────────────────────
$("btnRefreshCalendar").addEventListener("click", async () => {
  if (state.isDemo) { renderMeetings(); return; }
  meetingsList.innerHTML = `<div class="loading-row"><span class="spinner"></span> Fetching…</div>`;
  // Real call: fetch Google Calendar API with state.token
  await fetchGoogleCalendar();
  renderMeetings();
});

async function fetchGoogleCalendar() {
  // Real extension would call:
  // const resp = await fetch(
  //   "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=...&maxResults=10&singleEvents=true&orderBy=startTime",
  //   { headers: { Authorization: `Bearer ${state.token}` } }
  // );
  // For demo: use mock data
  loadDemoData();
}

function renderMeetings() {
  if (!state.meetings.length) {
    meetingsList.innerHTML = `<div class="empty-state">No meetings today.</div>`;
    return;
  }
  meetingsList.innerHTML = state.meetings.map(m => {
    const hasNote = state.notes.find(n => n.meetingId === m.id);
    const badge = m.status === "live"
      ? `<span class="meeting-badge badge-live">🔴 LIVE</span>`
      : m.status === "soon"
      ? `<span class="meeting-badge badge-soon">⏱ Soon</span>`
      : `<span class="meeting-badge badge-done">✓ Done</span>`;
    const genBtn = !hasNote
      ? `<br/><button class="btn-gen" data-id="${m.id}">✨ Generate notes</button>`
      : `<br/><button class="btn-gen" data-id="${m.id}" style="opacity:.5;pointer-events:none">✓ Notes ready</button>`;
    return `
      <div class="meeting-card ${m.status === 'live' ? 'live' : ''}" data-id="${m.id}">
        <div class="meeting-time-col">
          <div class="meeting-time">${m.time}</div>
          <div class="meeting-duration">${m.duration}</div>
        </div>
        <div class="meeting-info">
          <div class="meeting-title">${m.title}</div>
          <div class="meeting-attendees">👥 ${m.attendees.join(", ")}</div>
          ${genBtn}
        </div>
        ${badge}
      </div>`;
  }).join("");

  // Wire generate buttons
  meetingsList.querySelectorAll(".btn-gen").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const meeting = state.meetings.find(m => m.id === btn.dataset.id);
      if (meeting) generateNotes(meeting);
    });
  });
}

// ── Note generation via Airia agent ──────────────────────────────────────────
async function generateNotes(meeting) {
  showModal(meeting.title);
  const steps = [
    "Fetching calendar context…",
    "Invoking Airia MeetMind agent…",
    "Extracting key decisions…",
    "Identifying action items…",
    "Formatting meeting notes…"
  ];

  for (let i = 0; i < steps.length; i++) {
    await animateStep(steps[i], i, steps.length);
  }

  try {
    const notes = await callAiriaAgent(meeting);
    const noteId = "note_" + Date.now();
    const note = {
      id: noteId,
      meetingId: meeting.id,
      title: meeting.title,
      date: meeting.date,
      body: notes.summary,
      actions: notes.actions
    };
    state.notes.unshift(note);

    // Merge actions
    notes.actions.forEach((a, idx) => {
      state.actions.unshift({
        id: `action_${noteId}_${idx}`,
        text: a.text,
        owner: a.owner,
        done: false,
        meetingId: meeting.id
      });
    });

    hideModal();
    saveState();
    renderNotes();
    renderActions();

    // Open note detail
    openNoteOverlay(note);
  } catch (err) {
    console.error("[MeetMind] error:", err);
    const fallback = buildOfflineFallback(meeting);
    const noteId = "note_" + Date.now();
    const note = { id: noteId, meetingId: meeting.id, title: meeting.title, date: meeting.date, body: fallback.summary, actions: fallback.actions };
    state.notes.unshift(note);
    fallback.actions.forEach((a, idx) => { state.actions.unshift({ id: "action_"+noteId+"_"+idx, text: a.text, owner: a.owner, done: false, meetingId: meeting.id }); });
    progressBar.style.width = "100%";
    hideModal();
    saveState();
    renderNotes();
    renderActions();
    openNoteOverlay(note);
  }
}

async function callAiriaAgent(meeting) {
  // Load API key saved in Options page. Falls back to offline demo if missing.
  const apiKey = await getApiKey();
  if (!apiKey) return buildOfflineFallback(meeting);

  const prompt = buildAgentPrompt(meeting);
  const resp = await fetch(AIRIA_AGENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: `You are MeetMind, an Airia-powered meeting intelligence agent (Track 1: Airia Everywhere).\nGenerate structured meeting notes. Reply ONLY with valid JSON, no markdown, no preamble.\nSchema: { "summary": "string with ## heading sections", "actions": [{ "text": "string", "owner": "string" }] }`,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!resp.ok) {
    console.warn("[MeetMind] API", resp.status, "— using offline fallback");
    return buildOfflineFallback(meeting);
  }

  const data = await resp.json();
  const raw = data.content?.find(b => b.type === "text")?.text || "{}";
  try { return JSON.parse(raw); }
  catch { return { summary: raw, actions: [] }; }
}

async function getApiKey() {
  return new Promise(resolve => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get("meetmind_settings", d => {
        resolve(d?.meetmind_settings?.anthropicKey || null);
      });
    } else {
      try { resolve(JSON.parse(localStorage.getItem("mm_opts")||"{}").anthropicKey || null); }
      catch { resolve(null); }
    }
  });
}

function buildOfflineFallback(meeting) {
  const t = meeting.title.toLowerCase();
  const a = meeting.attendees || ["Alex M.", "Sarah K.", "Tom R."];
  const o = (i) => a[i] || a[0];
  if (t.includes("standup") || t.includes("sync")) {
    return {
      summary: "## Summary\nDaily standup completed. No blockers reported. Sprint on track.\n\n## Key Decisions\n- PR #482 approved for merge\n- Deploy window: Thursday EOD\n- Sprint planning moved to Friday 2pm\n\n## Action Items\n- Merge PR #482 and run smoke tests\n- Update sprint board estimates\n- Prepare planning agenda\n\n## Next Steps\nNext standup tomorrow same time.",
      actions: [
        { text: "Merge PR #482 and run smoke tests", owner: o(0) },
        { text: "Update sprint board estimates", owner: o(1) },
        { text: "Prepare sprint planning agenda", owner: o(2) }
      ]
    };
  }
  if (t.includes("customer") || t.includes("cs") || t.includes("success")) {
    return {
      summary: "## Summary\nMonthly CS review completed. Churn improved 12% MoM. 5 at-risk accounts identified.\n\n## Key Decisions\n- New onboarding checklist launching next week\n- Executive sponsor program approved\n- Health score reports to be automated\n\n## Action Items\n- Schedule calls with 5 at-risk accounts\n- Publish new onboarding checklist\n- Draft executive sponsor emails\n\n## Next Steps\nAt-risk calls within 5 business days. Full review in 4 weeks.",
      actions: [
        { text: "Schedule calls with at-risk accounts", owner: o(0) },
        { text: "Publish new onboarding checklist", owner: o(1) },
        { text: "Draft executive sponsor emails", owner: o(2) }
      ]
    };
  }
  return {
    summary: "## Summary\n" + meeting.title + " completed. Priorities confirmed and team aligned on Q2 scope.\n\n## Key Decisions\n- Feature X deferred to next cycle\n- Launch target: June 15\n- Design freeze: May 20\n- Infra budget $12k approved\n\n## Action Items\n- Update project timeline\n- Send stakeholder update\n- Book follow-up review May 28\n\n## Next Steps\nAll owners confirm tasks by EOD Friday. Follow-up May 28.",
    actions: [
      { text: "Update project timeline in Notion", owner: o(0) },
      { text: "Send stakeholder update email", owner: o(1) },
      { text: "Book follow-up review for May 28", owner: o(2) }
    ]
  };
}

function buildAgentPrompt(meeting) {
  return `Generate structured meeting notes for the following calendar event.

Meeting: ${meeting.title}
Date: ${meeting.date}
Time: ${meeting.time} (${meeting.duration})
Attendees: ${meeting.attendees.join(", ")}
Description/Agenda: ${meeting.description || "No agenda provided"}
Platform: ${meeting.platform || "Google Meet"}

Based on the meeting title and context, simulate realistic notes that would be generated by an AI agent listening to this meeting. Generate:
1. A concise executive summary (2-3 sentences)
2. 3-5 key decisions or discussion points
3. 3-5 specific action items with assigned owners (pick from attendees)
4. Clear next steps and follow-up schedule

Make the content realistic and specific to the meeting topic.`;
}

// ── Notes rendering ───────────────────────────────────────────────────────────
function renderNotes() {
  if (!state.notes.length) {
    notesList.innerHTML = `<div class="empty-state">No notes yet. Generate notes from the Upcoming tab.</div>`;
    return;
  }
  notesList.innerHTML = state.notes.map(n => `
    <div class="note-card" data-id="${n.id}">
      <div class="note-title">${n.title}</div>
      <div class="note-preview">${plainPreview(n.body)}</div>
      <div class="note-date">${n.date}</div>
    </div>`).join("");

  notesList.querySelectorAll(".note-card").forEach(card => {
    card.addEventListener("click", () => {
      const note = state.notes.find(n => n.id === card.dataset.id);
      if (note) openNoteOverlay(note);
    });
  });
}

// ── Actions rendering ─────────────────────────────────────────────────────────
function renderActions() {
  const open = state.actions.filter(a => !a.done);
  if (!open.length) {
    actionsList.innerHTML = `<div class="empty-state">No open actions. Generate notes to extract them.</div>`;
    return;
  }
  actionsList.innerHTML = open.map(a => `
    <div class="action-item" data-id="${a.id}">
      <div class="action-check ${a.done ? 'done' : ''}" data-id="${a.id}"></div>
      <div>
        <div class="action-text">${a.text}</div>
        <div class="action-owner">@ ${a.owner}</div>
      </div>
    </div>`).join("");

  actionsList.querySelectorAll(".action-check").forEach(chk => {
    chk.addEventListener("click", () => {
      const a = state.actions.find(x => x.id === chk.dataset.id);
      if (a) { a.done = true; saveState(); renderActions(); }
    });
  });
}

$("btnEmailActions").addEventListener("click", async () => {
  const open = state.actions.filter(a => !a.done);
  if (!open.length) { alert("No open actions to email!"); return; }
  // In a real extension: call Gmail MCP or Gmail API to send digest
  alert(`✅ Action digest sent!\n\n${open.map(a => `• ${a.text} (${a.owner})`).join("\n")}`);
});

// ── Note overlay ──────────────────────────────────────────────────────────────
function openNoteOverlay(note) {
  $("overlayTitle").textContent = note.title;
  $("overlayMeta").textContent = note.date;
  $("overlayBody").innerHTML = formatNoteBody(note.body);
  noteOverlay.classList.remove("hidden");
}

$("btnCloseOverlay").addEventListener("click", () => noteOverlay.classList.add("hidden"));

$("btnCopyNote").addEventListener("click", () => {
  navigator.clipboard.writeText($("overlayBody").innerText).then(() => {
    $("btnCopyNote").textContent = "✓ Copied";
    setTimeout(() => $("btnCopyNote").textContent = "⧉ Copy", 2000);
  });
});

function formatNoteBody(text) {
  return text
    .replace(/## (.+)/g, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)/gm, "• $1")
    .replace(/\n/g, "<br/>");
}

function plainPreview(text) {
  return text.replace(/##.+/g, "").replace(/\*\*/g, "").replace(/\n/g, " ").trim().slice(0, 90) + "…";
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function showModal(title) {
  $("modalMeetingTitle").textContent = title;
  modalSteps.innerHTML = "";
  progressBar.style.width = "0%";
  generateModal.classList.remove("hidden");
}

function hideModal() {
  generateModal.classList.add("hidden");
}

async function animateStep(text, index, total) {
  modalStatus.textContent = text;
  progressBar.style.width = `${((index + 1) / total) * 85}%`;

  const item = document.createElement("div");
  item.className = "step-item active";
  item.innerHTML = `<span>⟳</span> ${text}`;
  modalSteps.appendChild(item);

  await sleep(index === 1 ? 1800 : 600); // longest for the actual API call step

  item.className = "step-item done";
  item.innerHTML = `<span>✓</span> ${text}`;
}

// ── Status helpers ────────────────────────────────────────────────────────────
function setStatus(type, label) {
  statusPill.className = "status-pill " + (type || "");
  statusLabel.textContent = label || type;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
function loadDemoData() {
  const now = new Date();
  const fmt = d => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const soon = new Date(now.getTime() + 15 * 60000);
  const live = new Date(now.getTime() - 10 * 60000);
  const done = new Date(now.getTime() - 90 * 60000);

  state.user = state.user || { name: "Alex Mahmoud", email: "alex.mahmoud@example.com" };
  state.meetings = [
    {
      id: "m1",
      title: "Q2 Product Roadmap Review",
      time: fmt(live),
      duration: "60 min",
      status: "live",
      date: now.toDateString(),
      attendees: ["Sarah K.", "Tom R.", "Dina M."],
      description: "Review Q2 roadmap priorities, discuss feature cuts, align on shipping dates",
      platform: "Google Meet"
    },
    {
      id: "m2",
      title: "Engineering Standup",
      time: fmt(soon),
      duration: "15 min",
      status: "soon",
      date: now.toDateString(),
      attendees: ["Ali H.", "Mona S.", "Karim B."],
      description: "Daily standup — blockers, progress, PRs to review",
      platform: "Zoom"
    },
    {
      id: "m3",
      title: "Customer Success Review",
      time: fmt(done),
      duration: "45 min",
      status: "done",
      date: now.toDateString(),
      attendees: ["Layla A.", "James W.", "Nour F."],
      description: "Monthly CS metrics, churn analysis, top customer requests",
      platform: "Google Meet"
    }
  ];
}

// ── Persistence ───────────────────────────────────────────────────────────────
function saveState() {
  const s = { user: state.user, notes: state.notes, actions: state.actions, meetings: state.meetings };
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.set({ meetmind_state: s });
  } else {
    localStorage.setItem("meetmind_state", JSON.stringify(s));
  }
}

async function loadState() {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise(res => chrome.storage.local.get("meetmind_state", d => res(d.meetmind_state || null)));
  } else {
    const s = localStorage.getItem("meetmind_state");
    return s ? JSON.parse(s) : null;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
