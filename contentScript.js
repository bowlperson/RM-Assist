// contentScript.js
// Injects a hook into the page context to intercept fetch/XHR and pass event JSON back.

(function () {
  // 1) Inject hook into MAIN world
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("injectedHook.js");
  s.onload = () => s.remove();
  (document.documentElement || document.head).appendChild(s);

  // 2) Listen for messages from injectedHook.js
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "EXT_EVENT_PAYLOAD") return;

    // data.payload is an array or object; normalize to list of events
    const events = normalizeEvents(data.payload);
    if (!events.length) return;

    chrome.runtime.sendMessage({
      type: "EVENT_BATCH",
      pageUrl: location.href,
      events
    });
  });

  // In-page indicator handler (for "browser" notification mode)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "INDICATOR" && msg.payload?.show) {
      showCenterToast(msg.payload.title, msg.payload.message, msg.payload.kind);
    }
  });

  function normalizeEvents(payload) {
    // Your preview looked like [[{...}, {...}]] sometimes.
    // Handle: array, nested array, or object with array fields.
    let arr = payload;

    if (Array.isArray(arr) && arr.length === 1 && Array.isArray(arr[0])) {
      arr = arr[0];
    }
    if (!Array.isArray(arr)) return [];

    // Only keep fields we care about
    return arr.map(x => ({
      id: x.id ?? x.primary_key,
      updated_at: x.updated_at,
      reviewed_at: x.reviewed_at
    })).filter(x => x.id != null);
  }

  function showCenterToast(title, message, kind) {
    const id = "evt-toast-emerald";
    let el = document.getElementById(id);
    if (el) el.remove();

    el = document.createElement("div");
    el.id = id;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.top = "20%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.zIndex = "2147483647";
    el.style.padding = "12px 14px";
    el.style.border = "3px solid #0b2e1f";
    el.style.borderRadius = "10px";
    el.style.background = kind === "pending" ? "#f8f0b8" : "#d8ffd8";
    el.style.color = "#062014";
    el.style.boxShadow = "0 8px 0 rgba(0,0,0,0.25)";
    el.style.fontFamily = "ui-monospace, Consolas, monospace";
    el.style.maxWidth = "520px";
    el.style.textAlign = "left";
    el.style.opacity = "0";
    el.style.transition = "opacity 180ms ease, top 240ms ease";

    el.innerHTML = `
      <div style="font-weight:800; margin-bottom:4px;">${escapeHtml(title)}</div>
      <div style="font-weight:600; opacity:0.9;">${escapeHtml(message)}</div>
    `;

    document.documentElement.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.top = "22%";
    });

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.top = "20%";
      setTimeout(() => el.remove(), 240);
    }, 2000);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();
