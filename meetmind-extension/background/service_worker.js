// ─── MeetMind Service Worker ─────────────────────────────────────────────────
// Handles background tasks: alarm scheduling, meeting detection, badge updates

const ALARM_NAME = "meetmind_check";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[MeetMind] Extension installed");
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 5 });
  chrome.action.setBadgeBackgroundColor({ color: "#5b8eff" });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) checkUpcomingMeetings();
});

async function checkUpcomingMeetings() {
  const data = await chrome.storage.local.get("meetmind_state");
  const state = data.meetmind_state;
  if (!state?.meetings) return;

  const now = Date.now();
  const soonThreshold = 5 * 60 * 1000; // 5 min

  state.meetings.forEach(meeting => {
    // Check if a meeting is starting soon and notify
    // In production this parses real Google Calendar timestamps
    if (meeting.status === "soon") {
      chrome.notifications?.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Meeting starting soon 📅",
        message: `${meeting.title} in ~5 minutes. Open MeetMind to prepare.`
      });
    }
  });
}

// Message passing from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_CALENDAR") {
    // Would fetch Google Calendar here and return events
    sendResponse({ ok: true, events: [] });
  }

  if (msg.type === "SEND_EMAIL_DIGEST") {
    // Would call Gmail API to send action item digest
    console.log("[MeetMind] Email digest requested for", msg.actions?.length, "items");
    sendResponse({ ok: true });
  }

  return true; // keep channel open for async
});
