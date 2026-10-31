'use strict';
// Global game state (scene, settings, scores, current run) and building a run.

// ---------- state ----------
let scene = 'title', modeSel = 0, mode = 0, paused = false;
let offsetMs = load('offset', 0);
const bests = [load('best', 0), load('best1', 0), load('best2', 0)]; // best score per mode
const bestRanks = [load('rank0', -1), load('rank1', -1), load('rank2', -1)]; // best rank index per mode (-1 = never finished)
const isUnlocked = m => m === 0 || bestRanks[m - 1] >= UNLOCK_RANK;
const isLockedMode = m => m < MODES.length && (m >= PLAYABLE || !isUnlocked(m)); // false for the settings row
let volume = load('volume', 0.8);
// a brand-new player (nothing saved yet, no calibration done) is taken through calibration before the menu
let needsCalibration = load('calibrated', 0) === 0 && load('offset', null) === null;
const S = {};
let timer = 0;

function newRun() {
  Object.assign(S, {
    T0: 0,
    step: -8, // the READY beat (-5 to -4) is silent; sound starts on "3"
    calls: [], resp: [], callMap: new Map(), landMap: new Set(), path: [],
    ball: { x: BALL_X, y: 110 },
    flash: [0, 0], rings: [], // twin tap: core half flashes and shockwaves
    rounds: [], // call & response: the response notes of each round, to spot a flawless one
    strays: 0,  // presses where there was no note
    score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, bad: 0, miss: 0 },
    endBeat: ROUNDS.length * 8 + 1.5, done: false, doneAt: 0, deltas: [], applied: false,
  });
  if (mode === 0) {
    ROUNDS.forEach((pat, r) => pat.forEach((p, i) => {
      const b = r * 8 + p;
      S.calls.push({ beat: b, idx: i, done: false });
      S.callMap.set(b * 2, i);
      const note = { beat: r * 8 + 4 + p, idx: i, judged: false, round: r };
      S.resp.push(note);
      (S.rounds[r] = S.rounds[r] || []).push(note);
    }));
  } else if (mode === 1) {
    S.endBeat = BOUNCE_BARS.length * 4 + 1.5;
    let i = 0;
    BOUNCE_BARS.forEach((bar, r) => bar.forEach(p => {
      S.resp.push({ beat: r * 4 + p, idx: BOUNCE_SEQ[i++ % BOUNCE_SEQ.length], judged: false });
    }));
    buildBounceChains();
    // the ball's route: a start pad on the GO beat, every landing, then a few free hops to finish on
    S.path.push({ beat: -1, virt: true });
    for (const n of S.resp) S.path.push({ beat: n.beat, note: n });
    const lastBeat = S.resp[S.resp.length - 1].beat;
    for (let k = 1; k <= 4; k++) S.path.push({ beat: lastBeat + k, virt: true });
    S.path.forEach((p, k) => { p.y = Math.round(128 + 7 * Math.sin(k * 0.55)); if (p.beat >= 0) S.landMap.add(p.beat * 2); });
  } else {
    S.endBeat = TWIN_BARS.length * 4 + 1.5;
    const k = [0, 0]; // per-side counters so each twin walks its own melody
    TWIN_BARS.forEach((bar, r) => [...bar].forEach((ch, j) => {
      const beat = r * 4 + j / 2;
      for (const side of ch === 'B' ? [0, 1] : ch === 'L' ? [0] : ch === 'R' ? [1] : []) {
        S.resp.push({ beat, side, idx: side * 4 + (k[side]++ % 4), judged: false });
      }
    }));
    S.resp = enforceSideGap(S.resp);
    for (const n of S.resp) S.landMap.add(n.beat * 2);
    for (const n of S.resp) n.pair = S.resp.find(o => o !== n && o.beat === n.beat) || null; // the other half of a double
  }
  parts = []; pops = [];
  cpu.hit = player.hit = 0; cpu.sad = player.sad = 0;
}

let menuT = 0;
let menuFlash = 0; // 1 right after the highlighted mode changes, fading to 0

