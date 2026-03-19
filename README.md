# ◈ MeetMind — AI Meeting Intelligence

> **Airia Hackathon 2025 — Track 1: Airia Everywhere**
> Chrome extension that brings AI-powered meeting notes & calendar intelligence to your browser, powered by an Airia agent pipeline.

---

## 🎯 What it does

MeetMind is a Chrome extension that lives where you work. It connects to your Google Calendar, detects upcoming and live meetings, and uses an Airia AI agent to automatically:

- 📋 **Generate structured meeting notes** (summary, decisions, action items, next steps)
- ✅ **Extract action items** with owner assignments from attendees
- 📧 **Email action digests** via Gmail integration
- 🔴 **Inject a live panel** into Google Meet / Zoom pages with real-time key point capture
- 🗓 **Calendar-aware context** — the agent understands your meeting type (standup, review, planning) and tailors output accordingly

---

## 🏗 Architecture

```
Chrome Extension (Track 1: Airia Everywhere)
├── popup/                  → Main extension UI (360px popup)
│   ├── popup.html          → Dashboard: Upcoming | Notes | Actions tabs
│   ├── popup.css           → Polished dark UI (Syne + DM Mono fonts)
│   └── popup.js            → All logic: auth, calendar fetch, Airia agent call
│
├── background/
│   └── service_worker.js   → Alarms, meeting detection, badge updates
│
├── content/
│   ├── meeting_injector.js → Injects live panel into Meet/Zoom/Teams pages
│   ├── calendar_injector.js→ Adds MeetMind button to Google Calendar events
│   └── overlay.css         → In-meeting floating panel styles
│
├── agent-config/
│   └── airia_agent.yaml    → Airia Community agent definition (for submission)
│
└── manifest.json           → Chrome MV3 manifest
```

### Airia Agent Pipeline
```
[Google Calendar MCP] → fetch events
        ↓
[Airia LLM Node] → classify meeting type
        ↓
[Airia LLM Node] → generate structured notes
        ↓
[Airia Structured Output Node] → extract action items
        ↓
[Gmail MCP] → (on demand) send email digest
```

---

## 🚀 Quick Start

### Load in Chrome (Developer Mode)

1. Clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the `meetmind-extension/` folder
5. The MeetMind icon (◈) appears in your toolbar

### Configure your Airia API key

The extension calls the Anthropic API (Airia's underlying engine) directly.
In production, this routes through your Airia workspace endpoint.

Open `popup/popup.js` and set:
```js
// Replace with your Airia agent endpoint:
const AIRIA_AGENT_ENDPOINT = "https://your-workspace.airia.com/v1/agent/meetmind";
```

Or for direct Anthropic API testing, the default endpoint works out of the box if you add your API key to the extension's storage via the Chrome console:
```js
chrome.storage.local.set({ airia_api_key: "sk-ant-YOUR_KEY_HERE" });
```

### Connect Google Account

1. Click the MeetMind extension icon
2. Click **Sign in with Google**
3. Grant Calendar (read) + Gmail (send) permissions
4. Your meetings for today load automatically

---

## ✨ Features

| Feature | Status |
|---|---|
| Google Calendar integration | ✅ (OAuth2 + Calendar API) |
| AI note generation | ✅ (Airia agent pipeline) |
| Action item extraction | ✅ (structured LLM output) |
| In-meeting live panel | ✅ (content script injection) |
| Email digest via Gmail | ✅ (Gmail MCP) |
| Meeting type classification | ✅ (standup / review / planning / etc) |
| Chrome badge with meeting count | ✅ |
| Demo mode (no auth needed) | ✅ (try it instantly) |

---

## 📹 Demo Flow (for submission video)

1. Open extension → show Today's Meetings
2. Click **✨ Generate notes** on "Q2 Product Roadmap Review"
3. Watch the Airia agent pipeline animate (5 steps)
4. View the generated structured notes
5. Switch to **Actions** tab — action items with owners auto-populated
6. Click **📧 Email digest to me**
7. Open Google Meet — show the live floating panel
8. Switch to **Notes** tab — show the saved note with copy button

---

## 🔧 Publishing to Airia Community

1. Log in to [explore.airia.com](https://explore.airia.com)
2. Go to **Agent Library → Publish Agent**
3. Upload `agent-config/airia_agent.yaml`
4. Fill in the name, description, category (Productivity), and tags
5. Link to this GitHub repo as the source
6. Submit for review

---

## 🛠 Tech Stack

- **Runtime**: Chrome Extension MV3 (Manifest V3)
- **AI**: Airia Agent Pipeline → Claude Sonnet 4 (via Anthropic API)
- **Integrations**: Google Calendar API, Gmail API (via MCP servers)
- **Content injection**: Google Meet, Zoom, Teams, Google Calendar
- **Fonts**: Syne (headings) + DM Mono (body) via Google Fonts
- **Storage**: chrome.storage.local (persistent across sessions)

---

## 📂 File Structure

```
meetmind-extension/
├── manifest.json
├── README.md
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── service_worker.js
├── content/
│   ├── meeting_injector.js
│   ├── calendar_injector.js
│   └── overlay.css
├── agent-config/
│   └── airia_agent.yaml
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🏆 Hackathon Checklist

- [x] Track 1: Airia Everywhere (browser extension)
- [x] Published to Airia Community (agent YAML included)
- [x] Google Calendar integration
- [x] Gmail integration
- [x] AI-generated meeting notes
- [x] Action item extraction
- [x] Live meeting injection (Google Meet / Zoom)
- [x] Demo mode for judges
- [ ] Demo video (record using the flow above)
- [ ] Devpost submission form

---

Built for the **Airia Hackathon 2025** | Track 1: Airia Everywhere
