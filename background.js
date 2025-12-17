// background.js (MV3 service worker, ES module)

const DEFAULTS = {
  masterEnabled: true,
  notificationMode: "windows", // "windows" | "browser"
  newEventEnabled: true,
  pendingEnabled: true,
  pendingSeconds: 120, // default 2 min
  theme: "emerald",
  showInPageIndicator: true,
  // Site directory entries:
  // { origin: "http://10.3.5.105", nickname: "Mine Site", enabled: true }
  sites: []
};

// In-memory state (resets when service worker sleeps; we persist essential state in storage)
const mem = {
  // origin -> { [eventId]: { firstSeenAt, firstUpdatedAt, lastUpdatedAt, slaStartAt, slaTimerId } }
  originEvents: new Map()
};

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  // Ensure shape
  return { ...DEFAULTS, ...data };
}

function getSiteConfig(settings, origin) {
  const entry = (settings.sites || []).find(s => s.origin === origin);
  if (!entry) return { enabled: true, nickname: origin }; // default allow if not listed
  return { enabled: !!entry.enabled, nickname: entry.nickname || origin };
}

async function ensureOffscreen() {
  // Create an offscreen document for audio pings (code-generated WebAudio)
  const contexts = await chrome.runtime.getContexts?.({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  const hasOffscreen = Array.isArray(contexts) && contexts.length > 0;
  if (hasOffscreen) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play notification pings via WebAudio without asset files."
  });
}

async function playPing(kind = "new") {
  await ensureOffscreen();
  chrome.runtime.sendMessage({ type: "OFFSCREEN_PING", kind });
}

function notifyWindows(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "data:image/svg+xml;base64," + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
        <rect width="128" height="128" rx="18" ry="18" fill="#1f6f4a"/>
        <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="64" fill="#eafff3">!</text>
      </svg>
    `),
    title,
    message
  });
}

async function browserIndicatorAndMaybePing(tabId, payload) {
  // Tell content script to show indicator (and optionally do a browser-side ping)
  try {
    await chrome.tabs.sendMessage(tabId, { type: "INDICATOR", payload });
  } catch {
    // tab may not have content script (e.g., chrome:// pages)
  }
}

function getOrInitOriginMap(origin) {
  if (!mem.originEvents.has(origin)) {
    mem.originEvents.set(origin, new Map());
  }
  return mem.originEvents.get(origin);
}

function clearEventTimer(eventState) {
  if (eventState?.slaTimerId) {
    clearTimeout(eventState.slaTimerId);
    eventState.slaTimerId = null;
  }
}

function scheduleSla(origin, eventId, eventState, settings, siteNickname, tabId) {
  clearEventTimer(eventState);

  const remainingMs = Math.max(0, settings.pendingSeconds * 1000);
  eventState.slaTimerId = setTimeout(async () => {
    // Re-check current persisted state before firing (service worker may have slept; best effort)
    const latest = await chrome.storage.local.get(["persistedEvents"]);
    const persisted = latest.persistedEvents || {};
    const o = persisted[origin] || {};
    const e = o[eventId];
    if (!e) return;

    // If reviewed, skip
    if (e.reviewedAt) return;

    if (!settings.masterEnabled || !settings.pendingEnabled) return;
    const siteCfg = getSiteConfig(settings, origin);
    if (!siteCfg.enabled) return;

    const title = `Pending Event (${siteNickname})`;
    const msg = `Event ${eventId} has been pending for ${settings.pendingSeconds}s after becoming available.`;

    if (settings.notificationMode === "windows") {
      notifyWindows(title, msg);
      await playPing("pending");
    } else {
      await playPing("pending");
      await browserIndicatorAndMaybePing(tabId, {
        title,
        message: msg,
        kind: "pending",
        show: settings.showInPageIndicator
      });
    }
  }, remainingMs);
}

async function persistEventSnapshot(origin, originMap) {
  // Persist minimal event state so SLA survives service worker sleep reasonably well
  const out = {};
  for (const [eventId, s] of originMap.entries()) {
    out[eventId] = {
      firstSeenAt: s.firstSeenAt || null,
      firstUpdatedAt: s.firstUpdatedAt || null,
      lastUpdatedAt: s.lastUpdatedAt || null,
      slaStartAt: s.slaStartAt || null,
      reviewedAt: s.reviewedAt || null
    };
  }
  const current = await chrome.storage.local.get(["persistedEvents"]);
  const persisted = current.persistedEvents || {};
  persisted[origin] = out;
  await chrome.storage.local.set({ persistedEvents: persisted });
}

function parseOrigin(url) {
  try { return new URL(url).origin; } catch { return null; }
}

// Main ingestion from content script
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "EVENT_BATCH") return;
  const tabId = sender?.tab?.id;
  const pageUrl = sender?.tab?.url || msg.pageUrl;
  const origin = parseOrigin(pageUrl);
  if (!origin) return;

  (async () => {
    const settings = await getSettings();
    if (!settings.masterEnabled) return;

    const siteCfg = getSiteConfig(settings, origin);
    if (!siteCfg.enabled) return;

    const siteNickname = siteCfg.nickname || origin;
    const originMap = getOrInitOriginMap(origin);

    // msg.events: [{ id, updated_at, reviewed_at }]
    for (const ev of msg.events || []) {
      const eventId = String(ev.id ?? ev.primary_key ?? "");
      if (!eventId) continue;

      const updatedAt = Number(ev.updated_at ?? 0) || 0;
      const reviewedAt = ev.reviewed_at ? Number(ev.reviewed_at) : null;

      let st = originMap.get(eventId);
      const now = Date.now();

      if (!st) {
        // New event detected
        st = {
          firstSeenAt: now,
          firstUpdatedAt: updatedAt || null,
          lastUpdatedAt: updatedAt || null,
          slaStartAt: null,
          slaTimerId: null,
          reviewedAt: reviewedAt
        };
        originMap.set(eventId, st);

        if (settings.newEventEnabled) {
          const title = `New Event (${siteNickname})`;
          const msgText = `Event ${eventId} appeared in queue.`;
          if (settings.notificationMode === "windows") {
            notifyWindows(title, msgText);
            await playPing("new");
          } else {
            await playPing("new");
            await browserIndicatorAndMaybePing(tabId, {
              title,
              message: msgText,
              kind: "new",
              show: settings.showInPageIndicator
            });
          }
        }
        continue;
      }

      // Update existing state
      st.reviewedAt = reviewedAt || st.reviewedAt || null;

      // If reviewed, cancel SLA
      if (st.reviewedAt) {
        clearEventTimer(st);
        st.slaStartAt = st.slaStartAt || null;
        st.lastUpdatedAt = updatedAt || st.lastUpdatedAt;
        continue;
      }

      // Detect the "second update" logic:
      // Start SLA only when updated_at changes after first seen
      if (updatedAt && st.lastUpdatedAt && updatedAt !== st.lastUpdatedAt) {
        // If SLA not started yet, start it NOW (this is your chosen approach)
        if (!st.slaStartAt && settings.pendingEnabled) {
          st.slaStartAt = now;
          scheduleSla(origin, eventId, st, settings, siteNickname, tabId);
        }
        st.lastUpdatedAt = updatedAt;
      } else if (updatedAt && !st.lastUpdatedAt) {
        st.lastUpdatedAt = updatedAt;
      }
    }

    await persistEventSnapshot(origin, originMap);
  })();
});

// Optional: respond to popup asking for active tab origin, etc.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GET_SETTINGS") {
    (async () => sendResponse(await getSettings()))();
    return true;
  }
  if (msg?.type === "SET_SETTINGS") {
    (async () => {
      await chrome.storage.sync.set(msg.payload || {});
      sendResponse({ ok: true });
    })();
    return true;
  }
});
