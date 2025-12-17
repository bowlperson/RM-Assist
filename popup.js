const DEFAULTS = {
  masterEnabled: true,
  notificationMode: "windows",
  newEventEnabled: true,
  pendingEnabled: true,
  pendingSeconds: 120,
  theme: "emerald",
  showInPageIndicator: true,
  sites: []
};

function originOf(url) {
  try { return new URL(url).origin; } catch { return null; }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  const tab = await getActiveTab();
  const currentUrlEl = document.getElementById("currentUrl");
  const statusText = document.getElementById("statusText");
  currentUrlEl.textContent = tab?.url || "(no page)";
  statusText.textContent = "Loaded";

  const settings = await chrome.storage.sync.get(DEFAULTS);

  const masterEnabled = document.getElementById("masterEnabled");
  masterEnabled.checked = !!settings.masterEnabled;

  const siteEnabled = document.getElementById("siteEnabled");
  const siteToggleLabel = document.getElementById("siteToggleLabel");

  const origin = originOf(tab?.url || "");
  const siteEntry = (settings.sites || []).find(s => s.origin === origin);

  const nickname = siteEntry?.nickname || origin || "This Site";
  siteToggleLabel.textContent = nickname;

  // Default allow if not present
  siteEnabled.checked = siteEntry ? !!siteEntry.enabled : true;

  masterEnabled.addEventListener("change", async () => {
    await chrome.runtime.sendMessage({ type: "SET_SETTINGS", payload: { masterEnabled: masterEnabled.checked } });
    statusText.textContent = masterEnabled.checked ? "Enabled" : "Disabled";
  });

  siteEnabled.addEventListener("change", async () => {
    if (!origin) return;
    const sites = Array.isArray(settings.sites) ? [...settings.sites] : [];
    const idx = sites.findIndex(s => s.origin === origin);
    if (idx >= 0) sites[idx] = { ...sites[idx], enabled: siteEnabled.checked };
    else sites.push({ origin, nickname: origin, enabled: siteEnabled.checked });

    settings.sites = sites;
    await chrome.storage.sync.set({ sites });
    statusText.textContent = siteEnabled.checked ? "Site ON" : "Site OFF";
  });

  document.getElementById("openAdvanced").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

load();
