'use strict';
// Game engine: starting a run, scheduling audio, judging taps, scoring, ranks and pausing.

function startGame() {
  Theme.stop();
  const ctx = Snd.init();
  Snd.setVolume(volume);
  setTempo(mode);
  newRun();
  S.T0 = ctx.currentTime + 0.3 + 5 * SPB; // 5 count-in beats: READY, 3, 2, 1, GO
  scene = 'play';
  paused = false;
  clearInterval(timer);
  timer = setInterval(schedule, 25);
}

function stopGame() {
  clearInterval(timer);
  timer = 0;
}

// ---------- audio scheduling ----------
function schedule() {
  const ctx = Snd.ctx;
  const horizon = ctx.currentTime + 0.15;
  const lastStep = S.endBeat * 2;
  while (S.step <= lastStep && S.T0 + S.step * SPB / 2 < horizon) {
    scheduleStep(S.step);
    S.step++;
  }
}

function scheduleStep(s) {
  const t = S.T0 + s * SPB / 2;
  if (s < 0 || mode !== 1) { if (s % 2 === 0) Snd.kick(t); else Snd.hat(t); }
  if (s === -8 || s === -6 || s === -4) Snd.beep(t, 660); // "3", "2", "1"
  else if (s === -2) Snd.beep(t, 880);                    // "GO!", one beat before the first call
  if (s < 0) return;
  const st = s % 8;
  if (mode === 0) {
    const ch = CHORDS[Math.floor(s / 8) % 4];
    if (st === 0) Snd.pad(t, ch.n, SPB * 4);
    if (st === 0 || st === 3 || st === 6) Snd.bass(t, ch.r, SPB * 0.45);
    if (st === 2 || st === 6) Snd.clap(t);
    if (S.callMap.has(s)) Snd.pluck(t, S.callMap.get(s), 'cpu');
  } else if (mode === 2) {
    // twin tap: four on the floor, driving eighth-note bass, soft ticks on every pulse
    const ch = CHORDS_T[Math.floor(s / 8) % 8];
    if (st === 0) Snd.pad(t, ch.n, SPB * 4);
    Snd.bass(t, ch.r * TWIN_BASS[st], SPB * 0.35);
    if (st === 2 || st === 6) Snd.clap(t);
    if (S.landMap.has(s)) Snd.tick(t);
  } else {
    // bounce: its own groove - kick on 1 and 3 with a pickup, hats on the offbeats, a hopping bass line.
    // The landings tick softly and your taps play the melody.
    const bar = Math.floor(s / 8), ch = CHORDS_B[bar % 8];
    if (st % 2 === 1) Snd.hat(t);
    if (st === 0 || st === 4 || (st === 7 && bar % 2 === 1)) Snd.kick(t);
    if (st === 0) Snd.pad(t, ch.n, SPB * 4);
    if (BOUNCE_BASS[st]) Snd.bass(t, ch.r * BOUNCE_BASS[st], SPB * 0.4);
    if (st === 2 || st === 6) Snd.clap(t);
    if (S.landMap.has(s)) Snd.tick(t);
  }
}

// ---------- timing ----------
const visClock = () => Snd.ctx.currentTime - Snd.latency;
function pressClock(e) {
  const ctx = Snd.ctx;
  let t = ctx.currentTime;
  if (e && e.timeStamp) {
    const lag = (performance.now() - e.timeStamp) / 1000;
    if (lag >= 0 && lag < 0.2) t -= lag;
  }
  return t - Snd.latency + (offsetMs + (mode === 1 ? BOUNCE_DELAY_MS : 0)) / 1000; // positive offset = presses count as later
}

// ---------- input ----------
function press(e) {
  if (scene !== 'play' || paused || S.done) return;
  const ctx = Snd.ctx;
  const t = pressClock(e);
  const bp = (t - S.T0) / SPB;
  const side = mode === 2 ? sideOf(e) : -1; // twin tap: which key/half of the screen was used
  if (side === null) return;
  let best = null, bd = Infinity;
  for (const n of S.resp) {
    if (n.judged || (mode === 2 && n.side !== side)) continue;
    const d = Math.abs((bp - n.beat) * SPB);
    if (d < bd) { bd = d; best = n; }
  }
  if (mode === 0) triggerBot(player, 0);
  if (mode === 2) S.flash[side] = 1;
  if (best && bd <= W_BAD) {
    Snd.pluck(ctx.currentTime, best.idx, side === 0 ? 'cpu' : 'player', mode === 1 ? BOUNCE_SCALE : mode === 2 ? TWIN_SCALE : undefined);
    judge(best, (bp - best.beat) * SPB);
  } else if (mode === 0 ? inResponsePhase(bp) : bp > -1.5) {
    Snd.buzz(ctx.currentTime);
    strayPress(bp);
    player.sad = 0.4;
  } else {
    Snd.pluck(ctx.currentTime, 0, 'player'); // free jam outside the response window
  }
}

// A press where there is no note (a rest, or a second tap on a note you already hit) is a mistake:
// it breaks the combo, counts as a miss, drags accuracy down, and rules out a perfect bar and S+.
function strayPress(bp) {
  S.combo = 0;
  S.strays++;
  S.counts.miss++;
  pops.push({ t: 'MISS', col: C.red, life: 0.7, sub: 'EXTRA', ...popSpot() });
  if (mode === 0) {
    const round = S.rounds[Math.floor((bp - 3.6) / 8)];
    if (round) round.tainted = true;
  } else if (mode === 1) taintBounceChain(bp);
}

function judge(n, d) {
  const a = Math.abs(d);
  const j = a <= W_PERF ? 'perfect' : a <= W_GOOD ? 'good' : 'bad';
  n.judged = true;
  n.result = j;
  S.deltas.push(d * 1000);
  S.counts[j]++;
  S.combo = j === 'bad' ? 0 : S.combo + 1;
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  S.score += Math.round(POINTS[j] * (1 + Math.min(S.combo, 20) / 20));
  const label = { perfect: ['PERFECT', C.yel], good: ['GOOD', C.cyan], bad: ['OK', '#b79cff'] }[j];
  pops.push({ t: label[0], col: label[1], life: 0.7, sub: j === 'perfect' ? '' : (d < 0 ? 'EARLY' : 'LATE'), ...popSpot() });
  const sp = hitSpot(n);
  if (j === 'perfect') burst(sp.x, sp.y, C.yel, 10);
  else if (mode > 0) burst(sp.x, sp.y, label[1], 5);
  if (mode === 2) S.rings.push({ side: n.side, t: 0 });
  if (mode === 2 && n.pair && n.pair.judged && n.pair.result !== 'miss') doubleFx();
  if (mode === 0 && j === 'perfect' && !S.rounds[n.round].tainted && S.rounds[n.round].every(x => x.result === 'perfect')) perfectBarFx();
  const chain = mode === 1 && n.chain;
  if (chain && !chain.done && !chain.tainted && chain.notes.every(x => x.result === 'perfect')) { chain.done = true; bounceChainFx(); }
}

// where a hit bursts: the player bot's pad, the ball, or the side of the twin core
function hitSpot(n) {
  return mode === 0 ? { x: player.cx, y: 130 } : mode === 1 ? { x: S.ball.x, y: S.ball.y } : { x: n.side ? 172 : 148, y: 100 };
}
// where judgement text appears: by the player bot, above the ball, or above the core
function popSpot() { return mode === 0 ? {} : mode === 1 ? { x: BALL_X, y: 40 } : { x: 160, y: 58 }; }

function missNote(n) {
  n.judged = true;
  n.result = 'miss';
  S.counts.miss++;
  S.combo = 0;
  player.sad = 0.5;
  pops.push({ t: 'MISS', col: C.red, life: 0.7, sub: '', ...popSpot() });
}

function accuracy() {
  const c = S.counts, total = S.resp.length + S.strays; // extra presses count against you
  return (c.perfect * WEIGHT.perfect + c.good * WEIGHT.good + c.bad * WEIGHT.bad) / total;
}
// mean press error in ms (negative = early); null until there is enough data
function avgDelta() {
  if (S.deltas.length < 10) return null;
  return S.deltas.reduce((a, b) => a + b, 0) / S.deltas.length;
}
// F, D, C, B, A, S, S+ - S+ is reserved for a run where every note was Perfect
function rankOf(acc) {
  if (S.counts.perfect === S.resp.length && S.strays === 0) return 'S+';
  return acc >= 0.92 ? 'S' : acc >= 0.8 ? 'A' : acc >= 0.65 ? 'B' : acc >= 0.5 ? 'C' : acc >= 0.35 ? 'D' : 'F';
}

function togglePause(force) {
  if (scene !== 'play' || S.done) return;
  paused = force !== undefined ? force : !paused;
  if (paused) { pauseView = 'main'; pauseSel = 0; Snd.ctx.suspend(); } else Snd.ctx.resume();
}

