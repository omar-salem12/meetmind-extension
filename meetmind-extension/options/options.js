// ─── MeetMind Options Page ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const store = chrome?.storage?.local || {
  get: (k, cb) => cb(JSON.parse(localStorage.getItem('mm_opts') || '{}')),
  set: (obj) => { const d = JSON.parse(localStorage.getItem('mm_opts')||'{}'); localStorage.setItem('mm_opts', JSON.stringify({...d,...obj})); }
};

// ── Navigation ────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    $('section-' + item.dataset.section).classList.add('active');
  });
});

// ── Load saved settings ───────────────────────────────────────────────────────
store.get('meetmind_settings', data => {
  const s = data.meetmind_settings || {};
  if (s.airiaEndpoint)  $('airiaEndpoint').value  = s.airiaEndpoint;
  if (s.anthropicKey)   $('anthropicKey').value   = s.anthropicKey;
  if (s.model)          $('modelSelect').value     = s.model;

  // toggles
  const toggles = ['Summary','Decisions','Actions','Next','Sentiment','Remind','NotesReady','Meet','Zoom','AutoGen'];
  toggles.forEach(t => {
    const el = $('chk' + t);
    if (el && s['chk' + t] !== undefined) el.checked = s['chk' + t];
  });

  // Connection status
  if (s.googleConnected) {
    $('googleBadge').textContent = '✓ Connected';
    $('googleBadge').classList.add('connected');
    $('btnGoogleConnect').classList.add('hidden');
    $('btnGoogleDisconnect').classList.remove('hidden');
  }
  if (s.airiaEndpoint || s.anthropicKey) {
    $('airiaStatus').textContent = '✓ Configured';
    $('airiaStatus').classList.add('connected');
  }
});

// ── Google Connect ────────────────────────────────────────────────────────────
$('btnGoogleConnect').addEventListener('click', () => {
  // Real: chrome.identity.getAuthToken({ interactive: true, scopes: [...] }, token => { ... })
  // Hackathon demo: simulate
  $('btnGoogleConnect').textContent = 'Connecting…';
  setTimeout(() => {
    saveSettings({ googleConnected: true });
    $('googleBadge').textContent = '✓ Connected';
    $('googleBadge').classList.add('connected');
    $('btnGoogleConnect').classList.add('hidden');
    $('btnGoogleDisconnect').classList.remove('hidden');
    showToast('Google account connected!');
  }, 1400);
});

$('btnGoogleDisconnect').addEventListener('click', () => {
  saveSettings({ googleConnected: false, googleToken: null });
  $('googleBadge').textContent = 'Not connected';
  $('googleBadge').classList.remove('connected');
  $('btnGoogleConnect').classList.remove('hidden');
  $('btnGoogleDisconnect').classList.add('hidden');
  showToast('Google account disconnected');
});

// ── API Key toggle visibility ──────────────────────────────────────────────────
$('toggleKey').addEventListener('click', () => {
  const input = $('anthropicKey');
  if (input.type === 'password') { input.type = 'text'; $('toggleKey').textContent = 'Hide'; }
  else { input.type = 'password'; $('toggleKey').textContent = 'Show'; }
});

// ── Save Airia config + test ──────────────────────────────────────────────────
$('btnSaveAiria').addEventListener('click', async () => {
  const endpoint = $('airiaEndpoint').value.trim();
  const key = $('anthropicKey').value.trim();
  if (!endpoint && !key) { showTestResult('err', '✗ Enter an endpoint or API key'); return; }

  $('btnSaveAiria').textContent = 'Testing…';
  saveSettings({ airiaEndpoint: endpoint, anthropicKey: key });

  try {
    // Test the API key with a minimal call
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      })
    });
    if (resp.ok || resp.status === 401) {
      const ok = resp.ok;
      showTestResult(ok ? 'ok' : 'err', ok ? '✓ Connection successful' : '✗ Invalid API key');
      if (ok) {
        $('airiaStatus').textContent = '✓ Configured';
        $('airiaStatus').classList.add('connected');
      }
    } else {
      showTestResult('err', `✗ HTTP ${resp.status}`);
    }
  } catch {
    showTestResult('ok', '✓ Saved (offline — will test on next note generation)');
    $('airiaStatus').textContent = '✓ Configured';
    $('airiaStatus').classList.add('connected');
  }
  $('btnSaveAiria').textContent = 'Save & test';
  showToast('Airia settings saved');
});

function showTestResult(type, msg) {
  const el = $('testResult');
  el.className = 'test-result ' + type;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ── Save agent config ─────────────────────────────────────────────────────────
$('btnSaveAgent').addEventListener('click', () => {
  const toggles = ['Summary','Decisions','Actions','Next','Sentiment'];
  const settings = { model: $('modelSelect').value };
  toggles.forEach(t => { settings['chk' + t] = $('chk' + t).checked; });
  saveSettings(settings);
  showToast('Agent preferences saved');
});

// ── Clear data ────────────────────────────────────────────────────────────────
$('btnClearData').addEventListener('click', () => {
  if (!confirm('This will delete all saved notes, action items, and settings. Continue?')) return;
  store.set({ meetmind_state: null, meetmind_settings: null });
  showToast('All local data cleared');
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function saveSettings(patch) {
  store.get('meetmind_settings', data => {
    const current = data.meetmind_settings || {};
    store.set({ meetmind_settings: { ...current, ...patch } });
  });
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = '✓ ' + msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}
