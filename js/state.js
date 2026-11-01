'use strict';
// Global game state (scene, settings, scores, current run) and building a run.

// ---------- state ----------
let extra = false; // true while inside EXTRA: the same games at a higher BPM, with their own scores
let scene = 'title', menuSel = 0, modeSel = 0, mode = 0, paused = false; // menuSel: main menu row, modeSel: game select card
let offsetMs = load('offset', 0);
const bests = MODES.map((_, m) => load(m ? 'best' + m : 'best', 0)); // best score per mode
const bestRanks = MODES.map((_, m) => load('rank' + m, -1)); // best rank index per mode (-1 = never finished)
const xBests = MODES.map((_, m) => load('xbest' + m, 0)); // EXTRA keeps its own scores and ranks
const xRanks = MODES.map((_, m) => load('xrank' + m, -1));
const curBests = () => (extra ? xBests : bests);
const curRanks = () => (extra ? xRanks : bestRanks);
const isUnlocked = m => m === 0 || bestRanks[m - 1] >= UNLOCK_RANK;
const extraUnlocked = () => bestRanks.slice(0, PLAYABLE).every(r => r >= UNLOCK_RANK); // a C or better in every game
const isLockedMode = m => m >= PLAYABLE || (!extra && !isUnlocked(m));
let volume = load('volume', 0.8);
// a brand-new player (nothing saved yet, no calibration done) is taken through calibration before the menu
let needsCalibration = load('calibrated', 0) === 0 && load('offset', null) === null;
const S = {};
let timer = 0;

function newRun() {
  Object.assign(S, {
    T0: 0, unlockMsg: null,
    step: -8, // the READY beat (-5 to -4) is silent; sound starts on "3"
    calls: [], resp: [], callMap: new Map(), landMap: new Set(), path: [],
    ball: { x: BALL_X, y: 110 },
    flash: [0, 0], rings: [], // twin tap: core half flashes and shockwaves
    swing: 0, // ping pong: your paddle's swing, 1 right after a press
    smashBeat: -99, // ping pong: when your last successful smash landed, for the crowd's jump
    rounds: [], // call & response: the response notes of each round, to spot a flawless one
    strays: 0,  // presses where there was no note
    score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, bad: 0, miss: 0 },
    endBeat: ROUNDS.length * 8 + 1.5, done: false, doneAt: 0, deltas: [], applied: false,
  });
  if (mode === 0) {
    let idx = 0; // each note's place in CALL_TUNE; the call and your answer share it
    ROUNDS.forEach((pat, r) => {
      if (CALL_MELODY[r].split(' ').length !== pat.length) console.warn('call & response: round', r + 1, 'has', pat.length, 'beats but a different number of melody notes');
      pat.forEach(p => {
        const b = r * 8 + p, i = idx++;
        S.calls.push({ beat: b, idx: i, done: false });
        S.callMap.set(b * 2, i);
        const note = { beat: r * 8 + 4 + p, idx: i, judged: false, round: r };
        S.resp.push(note);
        (S.rounds[r] = S.rounds[r] || []).push(note);
      });
    });
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
  } else if (mode === 3) {
    S.endBeat = PONG_BARS.length * 4 + 1.5;
    buildPongRally();
  } else {
    S.endBeat = TWIN_SONG.length * 4 + 1.5;
    let idx = 0; // each note's place in TWIN_TUNE
    TWIN_SONG.forEach((bar, r) => bar.split(' ').forEach((tok, j) => {
      for (const m of tok.matchAll(/([<>])[A-G][#b]?\d/g)) S.resp.push({ beat: r * 4 + j / 2, side: m[1] === '<' ? 0 : 1, idx: idx++, judged: false });
    }));
    S.resp = enforceSideGap(S.resp);
    for (const n of S.resp) S.landMap.add(n.beat * 2);
    for (const n of S.resp) n.pair = S.resp.find(o => o !== n && o.beat === n.beat) || null; // the other half of a double
  }
  parts = []; pops = [];
  cpu.hit = player.hit = 0; cpu.sad = player.sad = 0;
}

let menuT = 0;
let menuFlash = 0; // 1 right after the highlighted menu row or game changes, fading to 0

