'use strict';
// Mode 3, Twin Tap: chart rules, key sides, the club backdrop, pulses and core, double effects, menu demo.

// Keeps the chart honest: drops any note that sits within MIN_SIDE_GAP beats after an opposite-side note
// (notes on the same beat are doubles and are fine). The authored chart should never trigger the warning.
function enforceSideGap(notes) {
  const kept = [];
  for (const n of notes) {
    const gap = k => n.beat - k.beat;
    if (kept.some(k => k.side !== n.side && gap(k) > 0 && gap(k) < MIN_SIDE_GAP)) console.warn('twin tap: dropped crowded note at beat', n.beat);
    else kept.push(n);
  }
  return kept;
}

// twin tap: 0 = left, 1 = right, null = not a twin key (e.g. Space)
function sideOf(e) {
  if (!e) return null;
  if (e.code) return LEFT_KEYS.includes(e.code) ? 0 : RIGHT_KEYS.includes(e.code) ? 1 : null;
  if (e.clientX !== undefined) {
    const r = view.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? 0 : 1;
  }
  return null;
}

// both halves of a double were hit: fireworks from the core, a wide ring, a flash and a little shake
function doubleFx() {
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, sp = 45 + (i % 4) * 28;
    parts.push({ x: TCX, y: TCY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, life: 0.7 + (i % 3) * 0.1, col: [C.cyan, C.white, C.mag, C.yel][i % 4] });
  }
  S.rings.push({ side: 0, t: 0, big: true }, { side: 1, t: 0, big: true });
  S.flash[0] = S.flash[1] = 1;
  S.shake = 0.25;
  pops.push({ t: 'DOUBLE!', col: C.white, life: 0.8, sub: '', x: 160, y: 30 });
}

const demoFlash = [0, 0]; // twin demo: core halves lighting up as pulses arrive

// twin tap demo: a small core of radius r centred on (cx, cy); the melody's two voices arrive as pulses
function drawTwinDemo(bp, cx, cy, r) {
  const sideCol = [C.cyan, C.mag];
  g.globalAlpha = 0.35; rect(0, cy, W, 1, '#8a7ab0'); g.globalAlpha = 1;
  for (const n of Theme.notesBetween(bp - 0.3, bp + 2.6)) {
    const side = n.who === 'cpu' ? 0 : 1, dir = side ? 1 : -1, d = (n.beat - bp) * TWIN_PX, x = cx + dir * d;
    if (d < r) continue; // already hit
    for (let k = 3; k >= 1; k--) { g.globalAlpha = 0.5 - k * 0.12; diamond(x + dir * k * 7, cy, 3, sideCol[side]); }
    g.globalAlpha = 1;
    diamond(x, cy, 5, sideCol[side]);
    diamond(x, cy, 2, C.white);
  }
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(r * Math.sqrt(1 - (dy / r) * (dy / r)));
    rect(cx - hw, cy + dy, hw, 1, demoFlash[0] > 0.4 ? C.white : C.cyan);
    rect(cx, cy + dy, hw, 1, demoFlash[1] > 0.4 ? C.white : C.mag);
  }
  disc(cx, cy, Math.round(r / 3), Math.round(r / 3), '#12062a');
  rect(cx, cy - r, 1, r * 2 + 1, '#12062a'); // the split between the halves, as on the real core
}

// ---------- twin tap scene ----------
const TCX = 160, TCY = 100; // the twin core

// A neon club: a lighting truss throws sweeping beams (cyan on the left, magenta on the right)
// over a row of LED equalizer bars that jump on every half beat.
function drawTwinBackground(bp) {
  const pulse = Math.pow(1 - posMod(bp, 1), 3);
  for (let y = 0; y < H; y += 4) rect(0, y, W, 4, mix('#04010c', '#150633', y / H));
  g.globalAlpha = 0.16 + pulse * 0.1; disc(TCX, TCY, 40, 40, '#7a2cff'); g.globalAlpha = 1;

  const lamps = [[30, C.cyan, 0], [95, C.cyan, 1.7], [225, C.mag, 3.4], [290, C.mag, 5.1]];
  g.globalAlpha = 0.1 + pulse * 0.06;
  for (const [ox, col, phase] of lamps) {
    const tx = ox + (TCX - ox) * 0.55 + Math.sin(bp * 0.8 + phase) * 38; // where the beam lands on the floor
    for (let y = 14; y < 150; y++) {
      const u = (y - 14) / 136, cx = ox + (tx - ox) * u, hw = 2 + u * 22;
      rect(cx - hw, y, hw * 2, 1, col);
    }
  }
  g.globalAlpha = 1;
  rect(0, 10, W, 2, '#241250');
  for (const [ox, col] of lamps) rect(ox - 3, 8, 7, 5, col);

  // equalizer: LED segments that glide up and down, dimmer than the gameplay colours
  const n = 40, bw = W / n, t = bp * Math.PI;
  for (let i = 0; i < n; i++) {
    const wave = 0.5 + 0.5 * Math.sin(t * (0.6 + hash(i) * 0.9) + hash(i + 50) * 6.28); // each bar has its own slow rhythm
    const h = Math.round(6 + 26 * wave * (0.85 + 0.15 * pulse));
    const col = mix('#0a8a99', '#99197f', i / (n - 1)), x = Math.round(i * bw);
    for (let y = H - 3; y > H - h; y -= 4) {
      g.globalAlpha = y < H - h + 6 ? 0.6 : 0.3;
      rect(x, y, Math.ceil(bw) - 1, 3, col);
    }
  }
  g.globalAlpha = 1;
}

function drawTwin(bp) {
  const sideCol = [C.cyan, C.mag];

  // beat ticks sliding in on the lane
  g.globalAlpha = 0.35; rect(0, TCY, W, 1, '#8a7ab0');
  for (let b = Math.floor(bp); b < bp + 3; b++) {
    const d = (b - bp) * TWIN_PX;
    if (d < 14) continue;
    rect(TCX - d, TCY - 3, 1, 7, '#8a7ab0'); rect(TCX + d, TCY - 3, 1, 7, '#8a7ab0');
  }
  g.globalAlpha = 1;

  // a bridge between the two pulses of a double, closing in on the core
  // (only for the double nearest the core: nothing unhit may still be ahead of it)
  const nextBeat = S.resp.find(o => !o.judged);
  for (const n of S.resp) {
    if (n.side !== 0 || !n.pair || n.judged || n.pair.judged || !nextBeat || n.beat > nextBeat.beat) continue;
    const d = (n.beat - bp) * TWIN_PX;
    if (d > 175 || d < 14) continue;
    g.globalAlpha = 0.4; rect(TCX - d, TCY - 1, d * 2, 3, C.white);
    g.globalAlpha = 0.14; rect(TCX - d, TCY - 3, d * 2, 7, C.yel);
    g.globalAlpha = 1;
  }

  // pulses
  for (const n of S.resp) {
    if (n.judged && n.result !== 'miss') continue;
    // left-key pulses come in from the left edge, right-key pulses from the right
    const d = (n.beat - bp) * TWIN_PX, dir = n.side ? 1 : -1; // d > 0: still on its way in
    if (d > 175 || d < -80) continue;
    const x = TCX + dir * d, missed = n.result === 'miss';
    g.globalAlpha = missed ? Math.max(0, 0.6 + d / 130) : 1;
    for (let k = 3; k >= 1; k--) { g.globalAlpha *= 0.6; diamond(x + dir * k * 9, TCY, 4, missed ? C.red : sideCol[n.side]); }
    g.globalAlpha = missed ? Math.max(0, 0.6 + d / 130) : 1;
    diamond(x, TCY, 8, missed ? C.red : sideCol[n.side]);
    diamond(x, TCY, 4, C.white);
    g.globalAlpha = 1;
  }

  // shockwaves from hits
  for (const r of S.rings) {
    g.globalAlpha = 1 - r.t / 0.35;
    const rad = 16 + r.t * (r.big ? 190 : 90);
    for (let a = -Math.PI / 2; a < Math.PI / 2; a += 0.06) {
      rect(TCX + (r.side ? 1 : -1) * Math.cos(a) * rad, TCY + Math.sin(a) * rad * 0.6, 1, 1, sideCol[r.side]);
    }
  }
  g.globalAlpha = 1;

  // the twin core: left half cyan, right half magenta
  const rr = 13 + Math.round(Math.pow(1 - posMod(bp, 1), 3) * 2);
  for (let dy = -rr; dy <= rr; dy++) {
    const hw = Math.round(rr * Math.sqrt(1 - (dy / rr) * (dy / rr)));
    rect(TCX - hw, TCY + dy, hw, 1, S.flash[0] > 0.4 ? C.white : C.cyan);
    rect(TCX, TCY + dy, hw, 1, S.flash[1] > 0.4 ? C.white : C.mag);
  }
  disc(TCX, TCY, rr - 5, rr - 5, '#12062a');
  rect(TCX, TCY - rr, 1, rr * 2 + 1, '#12062a');

  if (bp < 12) { // key reminders under the core
    text('<', TCX - 24, TCY + 20, C.cyan, 2, 'center');
    text('>', TCX + 24, TCY + 20, C.mag, 2, 'center');
  }
}

