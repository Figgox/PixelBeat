'use strict';
// The menu theme: an 8-bar loop on the same synth, with a 4-bar intro. Also feeds the menu demos.

// ---------- menu theme ----------
// 8 bars (Am F C G, twice). The square "bot" voice calls and the saw "player" voice answers.
const Theme = (() => {
  const LOOP = 64; // half-beat steps
  const INTRO = 32; // 4 bars of hats, bass and pad before the kick and melody (first pass only)
  // [beat, scale index, voice]
  const MEL = [
    [0, 3, 'cpu'], [1, 2, 'cpu'], [1.5, 1, 'cpu'], [2, 2, 'cpu'], [3, 3, 'cpu'],
    [4, 1, 'cpu'], [5, 1, 'cpu'], [5.5, 2, 'cpu'], [6, 1, 'cpu'], [7, 0, 'cpu'],
    [8, 4, 'player'], [9, 3, 'player'], [9.5, 4, 'player'], [10, 5, 'player'], [11, 4, 'player'],
    [12, 3, 'player'], [13, 2, 'player'], [13.5, 3, 'player'], [14, 2, 'player'],
    [16, 5, 'cpu'], [17, 4, 'cpu'], [17.5, 3, 'cpu'], [18, 4, 'cpu'], [19, 5, 'cpu'],
    [20, 5, 'player'], [21, 5, 'player'], [21.5, 4, 'player'], [22, 3, 'player'], [23, 1, 'player'],
    [24, 4, 'cpu'], [25, 3, 'cpu'], [26, 2, 'cpu'], [26.5, 3, 'cpu'], [27, 4, 'cpu'],
    [28, 2, 'player'], [28.5, 3, 'player'], [29, 4, 'player'], [30, 3, 'player'], [30.5, 2, 'player'], [31, 0, 'player'],
  ];
  const melody = new Map(MEL.map(m => [m[0] * 2, m]));
  let timer = 0, t0 = 0, step = 0;
  const played = []; // melody notes scheduled so far, waiting for the robots to animate them

  function play(s) {
    const t = t0 + s * SPB / 2, ls = s % LOOP, st = ls % 8, ch = CHORDS[Math.floor(ls / 8) % 4];
    if (s % 2 !== 0) Snd.hat(t);
    else if (s >= INTRO) Snd.kick(t); // kick waits for the 4-bar intro too
    if (st === 0) Snd.pad(t, ch.n, SPB * 4);
    if (st === 0 || st === 3 || st === 6) Snd.bass(t, ch.r, SPB * 0.45);
    if ((st === 2 || st === 6) && s >= 16) Snd.clap(t); // drums open up after the first two bars
    if (s >= INTRO) { // call and response enters after the 4-bar intro
      const m = melody.get((s - INTRO) % LOOP);
      if (m) { Snd.pluck(t, m[1], m[2]); played.push({ beat: s / 2, idx: m[1], who: m[2] }); }
    }
  }
  function tick() {
    const horizon = Snd.ctx.currentTime + 0.15;
    while (t0 + step * SPB / 2 < horizon) play(step++);
  }
  return {
    start() {
      if (timer || !Snd.ctx) return;
      t0 = Snd.ctx.currentTime + 0.1;
      step = 0;
      played.length = 0;
      timer = setInterval(tick, 25);
    },
    stop() { clearInterval(timer); timer = 0; played.length = 0; },
    // melody notes whose moment has arrived (heard time), oldest first
    takeDue() {
      const b = (Snd.ctx.currentTime - Snd.latency - t0) / SPB, due = [];
      while (played.length && played[0].beat <= b) due.push(played.shift());
      return due;
    },
    // melody notes (with their voice) falling between two theme beats; the melody starts after the intro and loops
    notesBetween(from, to) {
      const out = [], base = INTRO / 2, len = LOOP / 2;
      for (let k = Math.max(0, Math.floor((from - base) / len)); base + k * len <= to; k++) {
        for (const m of MEL) {
          const beat = base + k * len + m[0];
          if (beat >= from && beat <= to) out.push({ beat, idx: m[1], who: m[2] });
        }
      }
      return out;
    },
    get running() { return !!timer; },
    beat() { return (Snd.ctx.currentTime - Snd.latency - t0) / SPB; },
  };
})();

