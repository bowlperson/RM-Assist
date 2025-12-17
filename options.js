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

const THEMES = [
  // Emerald-ish
  { id: "emerald", name: "Emerald (Classic)", vars: {
    "--bg": "#d7f7df", "--card": "#f9fffb", "--border": "#0b2e1f",
    "--text": "#062014", "--accent": "#1f6f4a", "--accent2": "#2aa36d"
  }},
  { id: "ruby", name: "Ruby (Warm)", vars: {
    "--bg": "#ffe0de", "--card": "#fff6f5", "--border": "#3a0b0b",
    "--text": "#2a0707", "--accent": "#b32020", "--accent2": "#e24b4b"
  }},
  { id: "sapphire", name: "Sapphire (Cool)", vars: {
    "--bg": "#ddefff", "--card": "#f6fbff", "--border": "#08243a",
    "--text": "#061a2a", "--accent": "#1b5ea8", "--accent2": "#3d8ee6"
  }},
  { id: "leaf", name: "Leaf (Soft)", vars: {
    "--bg": "#e8ffe6", "--card": "#fbfffb", "--border": "#13320b",
    "--text": "#0f2209", "--accent": "#2a7f2a", "--accent2": "#4dc74d"
  }},
  // Dark themes (at least 3)
  { id: "dark_emerald", name: "Dark Emerald", vars: {
    "--bg": "#0b1210", "--card": "#101b17", "--border": "#2be18d",
    "--text": "#d8fff0", "--accent": "#1f6f4a", "--accent2": "#2aa36d"
  }},
  { id: "dark_midnight", name: "Dark Midnight", vars: {
    "--bg": "#0b0f18", "--card": "#111827", "--border": "#93c5fd",
    "--text": "#e5f0ff", "--accent": "#3b82f6", "--accent2": "#60a5fa"
  }},
  { id: "dark_amber", name: "Dark Amber", vars: {
    "--bg": "#0f0c07", "--card": "#1a140b", "--border": "#fbbf24",
    "--text": "#fff2cc", "--accent": "#b45309", "--accent2": "#f59e0b"
  }}
];

function applyTheme(themeId) {
  const t = THEMES.find(x => x.id === themeId) || THEMES[0];
  for (const [k, v] of Object.entries(t.vars)) {
    document.documentElement.style.setProperty(k, v);
  }
}

function originOf(input) {
  try {
    // Allow raw origin "http://10.3.5.105"
    if (/^https?:\/\/[^/]+$/i.test(input.trim())) return input.trim();
    return new URL(input.trim()).origin;
  } catch {
    return null;
  }
}

function mmssToSeconds(mm, ss) {
  const m = Math.max(0, Number(mm) || 0);
  const s = Math.max(0, Math.min(59, Number(ss) || 0));
  return (m * 60) + s;
}

function secondsToMmss(total) {
  const t = Math.max(0, Number(total) || 0);
  const mm = Math.floor(t / 60);
  const ss = t % 60;
  return { mm, ss };
}

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);

  // Theme select
  const themeSelect = document.getElementById("themeSelect");
  themeSelect.innerHTML = THEMES.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  themeSelect.value = data.theme || "emerald";
  applyTheme(themeSelect.value);

  themeSelect.addEventListener("change", async () => {
    applyTheme(themeSelect.value);
    await save({ theme: themeSelect.value });
  });

  // Notification mode
  const notificationMode = document.getElementById("notificationMode");
  notificationMode.value = data.notificationMode || "windows";
  notificationMode.addEventListener("change", async () => {
    await save({ notificationMode: notificationMode.value });
  });

  // toggles
  const showInPageIndicator = document.getElementById("showInPageIndicator");
  showInPageIndicator.checked = !!data.showInPageIndicator;
  showInPageIndicator.addEventListener("change", async () => {
    await save({ showInPageIndicator: showInPageIndicator.checked });
  });

  const newEventEnabled = document.getElementById("newEventEnabled");
  newEventEnabled.checked = !!data.newEventEnabled;
  newEventEnabled.addEventListener("change", async () => {
    await save({ newEventEnabled: newEventEnabled.checked });
  });

  const pendingEnabled = document.getElementById("pendingEnabled");
  pendingEnabled.checked = !!data.pendingEnabled;
  pendingEnabled.addEventListener("change", async () => {
    await save({ pendingEnabled: pendingEnabled.checked });
  });

  // SLA mm:ss
  const { mm, ss } = secondsToMmss(data.pendingSeconds);
  const slaMin = document.getElementById("slaMin");
  const slaSec = document.getElementById("slaSec");
  slaMin.value = String(mm);
  slaSec.value = String(ss).padStart(2, "0");

  const saveSla = async () => {
    const secs = mmssToSeconds(slaMin.value, slaSec.value);
    await save({ pendingSeconds: secs });
  };
  slaMin.addEventListener("change", saveSla);
  slaSec.addEventListener("change", saveSla);

  // Test ping
  document.getElementById("testPing").addEventListener("click", async () => {
    // Trigger a ping via notifications pipeline (kind "new")
    chrome.runtime.sendMessage({ type: "OFFSCREEN_PING", kind: "new" });
    setStatus("Ping!");
    setTimeout(() => setStatus("Ready"), 900);
  });

  // Site directory
  renderSites(data.sites || []);

  document.getElementById("addSite").addEventListener("click", async () => {
    const urlInput = document.getElementById("siteUrl").value;
    const nickInput = document.getElementById("siteNick").value.trim();

    const origin = originOf(urlInput);
    if (!origin) {
      setStatus("Invalid URL/origin.");
      return;
    }

    const current = await chrome.storage.sync.get(DEFAULTS);
    const sites = Array.isArray(current.sites) ? [...current.sites] : [];
    const idx = sites.findIndex(s => s.origin === origin);

    const entry = {
      origin,
      nickname: nickInput || (idx >= 0 ? (sites[idx].nickname || origin) : origin),
      enabled: idx >= 0 ? !!sites[idx].enabled : true
    };

    if (idx >= 0) sites[idx] = entry;
    else sites.push(entry);

    await save({ sites });
    renderSites(sites);
    setStatus("Saved site.");
  });
}

async function save(patch) {
  await chrome.storage.sync.set(patch);
  setStatus("Saved.");
  setTimeout(() => setStatus("Ready"), 650);
}

function setStatus(text) {
  document.getElementById("saveStatus").textContent = text;
}

function renderSites(sites) {
  const list = document.getElementById("siteList");
  if (!sites.length) {
    list.innerHTML = `<div class="mono" style="opacity:0.8;">No sites added yet. (Defaults to ON for all sites.)</div>`;
    return;
  }

  list.innerHTML = "";
  for (const s of sites) {
    const row = document.createElement("div");
    row.className = "siteRow";

    const meta = document.createElement("div");
    meta.className = "siteMeta";
    meta.innerHTML = `
      <div class="siteTitle">${escapeHtml(s.nickname || s.origin)}</div>
      <div class="siteSub mono">${escapeHtml(s.origin)}</div>
    `;

    const toggle = document.createElement("label");
    toggle.className = "toggle";
    toggle.innerHTML = `
      <input type="checkbox" ${s.enabled ? "checked" : ""} />
      <span class="slider"></span>
    `;
    toggle.querySelector("input").addEventListener("change", async (e) => {
      const current = await chrome.storage.sync.get(DEFAULTS);
      const updated = (current.sites || []).map(x => x.origin === s.origin ? { ...x, enabled: e.target.checked } : x);
      await save({ sites: updated });
      renderSites(updated);
    });

    row.appendChild(meta);
    row.appendChild(toggle);
    list.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

load();
