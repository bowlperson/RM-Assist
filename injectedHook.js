// injectedHook.js (runs in page context, not extension context)
// Intercepts XHR + fetch responses and posts relevant JSON back to contentScript.

(function () {
  const DEFAULT_PATTERNS = ["/gvos/object/fatigue_event"];
  const MAX_JSON_CHARS = 2_000_000; // safety
  let endpointPatterns = [...DEFAULT_PATTERNS];

  function shouldCapture(url) {
    try {
      if (typeof url !== "string") return false;
      return endpointPatterns.some((pattern) => url.includes(pattern));
    } catch {
      return false;
    }
  }

  // ---- fetch hook ----
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = (args[0] && args[0].url) ? args[0].url : String(args[0] || "");
      const clone = res.clone();
      const text = await clone.text();
      if (text && text.length <= MAX_JSON_CHARS) {
        const payload = tryParseJson(text);
        if (payload != null && (shouldCapture(url) || payloadLooksLikeEvents(payload))) {
          window.postMessage({ type: "EXT_EVENT_PAYLOAD", payload }, "*");
        }
      }
    } catch {
      // ignore
    }
    return res;
  };

  // ---- XHR hook ----
  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = "";

    const origOpen = xhr.open;
    xhr.open = function (method, url, ...rest) {
      _url = String(url || "");
      return origOpen.call(this, method, url, ...rest);
    };

    xhr.addEventListener("load", function () {
      try {
        const ct = xhr.getResponseHeader("content-type") || "";
        const isJson = ct.includes("application/json") || ct.includes("text/json") || ct.includes("json");
        if (!isJson && typeof xhr.responseText !== "string") return;

        const text = xhr.responseText;
        if (!text || text.length > MAX_JSON_CHARS) return;

        const payload = tryParseJson(text);
        if (payload != null && (shouldCapture(_url) || payloadLooksLikeEvents(payload))) {
          window.postMessage({ type: "EXT_EVENT_PAYLOAD", payload }, "*");
        }
      } catch {
        // ignore
      }
    });

    return xhr;
  }
  window.XMLHttpRequest = PatchedXHR;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (data?.type !== "EXT_ENDPOINT_PATTERNS") return;
    if (!Array.isArray(data.patterns)) return;
    endpointPatterns = data.patterns.filter((pattern) => typeof pattern === "string");
    if (!endpointPatterns.length) endpointPatterns = [...DEFAULT_PATTERNS];
  });

  function tryParseJson(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function payloadLooksLikeEvents(payload) {
    const arr = findEventArray(payload);
    return Array.isArray(arr) && arr.length > 0;
  }

  function findEventArray(payload) {
    if (Array.isArray(payload)) {
      if (payload.some(isEventLike)) return payload;
      const nested = payload.find(Array.isArray);
      if (nested && nested.some(isEventLike)) return nested;
      return null;
    }

    if (payload && typeof payload === "object") {
      const direct = payload.data || payload.results || payload.objects || payload.items;
      if (Array.isArray(direct) && direct.some(isEventLike)) return direct;
      for (const value of Object.values(payload)) {
        if (Array.isArray(value) && value.some(isEventLike)) return value;
      }
    }
    return null;
  }

  function isEventLike(value) {
    return value && typeof value === "object" && ("id" in value || "primary_key" in value);
  }
})();
