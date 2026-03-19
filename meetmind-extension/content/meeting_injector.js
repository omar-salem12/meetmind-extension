// ─── MeetMind Meeting Injector ───────────────────────────────────────────────
// Injects a floating MeetMind panel into Google Meet / Zoom / Teams pages
// to show live note status and quick actions during a meeting.

(function () {
  if (document.getElementById("meetmind-panel")) return;

  // Wait for meeting to fully load
  const init = () => {
    const panel = document.createElement("div");
    panel.id = "meetmind-panel";
    panel.innerHTML = `
      <div class="mm-header">
        <span class="mm-logo">◈ MeetMind</span>
        <span class="mm-badge">● LIVE</span>
        <button class="mm-close" id="mm-close-btn">✕</button>
      </div>
      <div class="mm-body">
        <div class="mm-status" id="mm-status">Agent monitoring meeting…</div>
        <div class="mm-actions">
          <button class="mm-btn" id="mm-gen-btn">✨ Generate notes now</button>
          <button class="mm-btn mm-ghost" id="mm-min-btn">— Minimize</button>
        </div>
        <div class="mm-transcript" id="mm-transcript">
          <div class="mm-t-label">Live key points</div>
          <div class="mm-t-items" id="mm-t-items"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Wire close
    document.getElementById("mm-close-btn").addEventListener("click", () => panel.remove());

    // Wire minimize
    let minimized = false;
    document.getElementById("mm-min-btn").addEventListener("click", () => {
      minimized = !minimized;
      panel.classList.toggle("minimized", minimized);
      document.getElementById("mm-min-btn").textContent = minimized ? "+ Expand" : "— Minimize";
    });

    // Wire generate
    document.getElementById("mm-gen-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP_NOTES" });
      document.getElementById("mm-status").textContent = "Opening MeetMind popup…";
    });

    // Simulate live key point capture (in production this would use
    // Google Meet's closed caption DOM or a speech-to-text API)
    simulateLiveKeyPoints();
  };

  function simulateLiveKeyPoints() {
    const demoPoints = [
      "Roadmap Q2 scope confirmed",
      "Feature X pushed to Q3",
      "Sarah to update design specs",
      "Launch date: June 15",
      "Budget approved for infra upgrade"
    ];
    const container = document.getElementById("mm-t-items");
    let i = 0;

    const interval = setInterval(() => {
      if (i >= demoPoints.length || !document.getElementById("mm-t-items")) {
        clearInterval(interval);
        return;
      }
      const item = document.createElement("div");
      item.className = "mm-t-item";
      item.textContent = "• " + demoPoints[i];
      container.prepend(item);
      i++;
    }, 8000);
  }

  // Inject on meet.google.com after call starts
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 3000));
  } else {
    setTimeout(init, 3000);
  }
})();
