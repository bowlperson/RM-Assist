// offscreen.js - code-generated pings (no audio assets)

function gbaLikePing(kind = "new") {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const now = ctx.currentTime;

  // A small “GBA-ish” chirp: square -> quick pitch drops, plus a soft triangle underpin.
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(kind === "pending" ? 0.25 : 0.18, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "pending" ? 0.28 : 0.20));
  master.connect(ctx.destination);

  const makeOsc = (type, f0, f1, tEnd, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.detune.value = detune;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(type === "square" ? 0.9 : 0.35, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + tEnd);

    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f1, now + tEnd);

    o.connect(g);
    g.connect(master);

    o.start(now);
    o.stop(now + tEnd + 0.02);
  };

  if (kind === "pending") {
    makeOsc("square", 880, 440, 0.22, -10);
    makeOsc("square", 660, 330, 0.22, +10);
    makeOsc("triangle", 220, 180, 0.26, 0);
  } else {
    makeOsc("square", 740, 520, 0.16, 0);
    makeOsc("triangle", 196, 170, 0.18, 0);
  }

  // Clean up
  setTimeout(() => ctx.close().catch(() => {}), 800);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "OFFSCREEN_PING") {
    gbaLikePing(msg.kind || "new");
  }
});
