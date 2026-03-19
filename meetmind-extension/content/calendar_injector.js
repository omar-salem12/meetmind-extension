// ─── MeetMind Calendar Injector ──────────────────────────────────────────────
// Adds a "Generate Notes" button to Google Calendar event detail popups

(function () {
  const observer = new MutationObserver(() => {
    // Look for event detail popups in Google Calendar
    const popups = document.querySelectorAll('[data-eventid]:not([data-mm-injected])');
    popups.forEach(popup => {
      popup.setAttribute("data-mm-injected", "1");

      const btn = document.createElement("button");
      btn.textContent = "◈ MeetMind Notes";
      btn.style.cssText = `
        margin: 6px 0;
        padding: 6px 12px;
        background: linear-gradient(135deg, #5b8eff, #a78bfa);
        color: white;
        border: none;
        border-radius: 6px;
        font-family: sans-serif;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
      `;
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_POPUP_NOTES" });
      });

      const actions = popup.querySelector("[data-view-action]") || popup;
      if (actions) actions.appendChild(btn);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
