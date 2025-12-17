// injectedHook.js (runs in page context, not extension context)
// Intercepts XHR + fetch responses and posts relevant JSON back to contentScript.

(function () {
  const TARGET_HINT = "/gvos/object/fatigue_event";
  const MAX_JSON_CHARS = 2_000_000; // safety

  function shouldCapture(url) {
    try {
      return typeof url === "string" && url.includes(TARGET_HINT);
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
      if (shouldCapture(url)) {
        const clone = res.clone();
        const text = await clone.text();
        if (text && text.length <= MAX_JSON_CHARS) {
          const payload = tryParseJson(text);
          if (payload != null) {
            window.postMessage({ type: "EXT_EVENT_PAYLOAD", payload }, "*");
          }
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
        if (!shouldCapture(_url)) return;
        const ct = xhr.getResponseHeader("content-type") || "";
        const isJson = ct.includes("application/json") || ct.includes("text/json") || ct.includes("json");
        if (!isJson && typeof xhr.responseText !== "string") return;

        const text = xhr.responseText;
        if (!text || text.length > MAX_JSON_CHARS) return;

        const payload = tryParseJson(text);
        if (payload != null) {
          window.postMessage({ type: "EXT_EVENT_PAYLOAD", payload }, "*");
        }
      } catch {
        // ignore
      }
    });

    return xhr;
  }
  window.XMLHttpRequest = PatchedXHR;

  function tryParseJson(text) {
    try { return JSON.parse(text); } catch { return null; }
  }
})();
