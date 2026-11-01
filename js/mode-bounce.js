'use strict';
// Mode 2, Bounce: the sunset backdrop, the ball and pads, and the menu demo path.

// ---------- bounce scene ----------
// Side-scrolling backdrop: every layer slides left at its own fraction of the pads' speed (parallax).
const GROUND = 150;
const bounceSky = []; // sunset: indigo overhead, glowing pink and amber at the horizon
for (let y = 0; y < GROUND; y += 4) {
  const k = y / GROUND;
  bounceSky.push(k < 0.55 ? mix('#06011a', '#26093f', k / 0.55) : k < 0.85 ? mix('#26093f', '#661248', (k - 0.55) / 0.3) : mix('#661248', '#85301f', (k - 0.85) / 0.15));
}
const bounceSea = []; // water: warm violet at the horizon down to near black
for (let y = GROUND; y < H; y += 3) bounceSea.push(mix('#3a1360', '#05011a', (y - GROUND) / (H - GROUND)));

// Neon sunset over the sea. Every layer slides left at its own fraction of the pads' speed (parallax),
// and the pads stand on piers that reach down to the waterline.
function drawBounceBackground(bp) {
  const pulse = Math.pow(1 - posMod(bp, 1), 3);
  const tms = performance.now() / 1000;
  bounceSky.forEach((c, i) => rect(0, i * 4, W, 4, c));

  // a few stars high up, fading as the sky warms
  for (const s of stars) if (s.y < 40) rect(posMod(s.x - bp * PX_PER_BEAT * 0.02, W), s.y, 1, 1, '#e9dcff');

  // the sun, half sunk into the sea
  const sx = 210, sr = 38 + Math.round(pulse * 2);
  for (let dy = -sr; dy < 0; dy++) {
    const depth = (dy + sr) / sr; // 0 at the top of the sun, 1 at the waterline
    if (depth > 0.5 && posMod(dy, 6) < (depth - 0.5) * 9) continue; // sunset stripes
    const hw = Math.floor(Math.sqrt(sr * sr - dy * dy));
    rect(sx - hw, GROUND + dy, hw * 2, 1, mix('#fff200', '#ff2bd6', (dy + sr) / sr));
  }

  // streaky clouds, two depths
  for (const [speed, tile, col, shade] of [[0.05, 150, '#ff9fc0', '#8a2a9a'], [0.12, 110, '#ff7aa8', '#6a1b8a']]) {
    const off = bp * PX_PER_BEAT * speed;
    for (let k = Math.floor(off / tile) - 1; k * tile - off < W; k++) {
      const x = Math.round(k * tile - off + hash(k + speed * 100) * 30), y = 24 + Math.floor(hash(k * 3 + tile) * 55);
      const w = 36 + Math.floor(hash(k + 77 + tile) * 44);
      g.globalAlpha = 0.3;
      rect(x, y, w, 2, col); rect(x + 6, y - 2, w - 18, 2, col); rect(x + 4, y + 2, w - 8, 2, shade);
      g.globalAlpha = 1;
    }
  }

  // distant islands with palm trees
  let off = bp * PX_PER_BEAT * 0.2;
  for (let k = Math.floor(off / 110) - 1; k * 110 - off < W + 80; k++) {
    const left = Math.round(k * 110 - off + 20), w = 50 + Math.floor(hash(k + 31) * 40), h = 8 + Math.floor(hash(k + 57) * 14);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1), top = Math.round(GROUND - h * (1 - Math.pow(2 * u - 1, 2)));
      rect(left + x, top, 1, GROUND - top, '#2a0a4a');
    }
    if (hash(k + 90) > 0.35) {
      const px = left + Math.floor(w * 0.5), py = GROUND - h - 1;
      rect(px, py - 9, 1, 9, '#1a0630');
      for (const [fx, fy] of [[-4, -1], [-3, -2], [-2, -2], [-1, -1], [1, -1], [2, -2], [3, -2], [4, -1]]) rect(px + fx, py - 9 + fy, 1, 1, '#1a0630');
    }
  }

  // the sea, scrolling in step with the pads
  bounceSea.forEach((c, i) => rect(0, GROUND + i * 3, W, 3, c));
  rect(0, GROUND, W, 1, '#ffd36b');
  for (let y = GROUND + 2; y < H; y += 2) { // sun glitter, shimmering
    const spread = 4 + (y - GROUND) * 0.5, r = hash(y * 13 + Math.floor(tms * 5));
    if (r > 0.45) rect(sx - spread * r + (hash(y) - 0.5) * 6, y, 3 + r * spread * 0.6, 1, r > 0.8 ? '#fff6a0' : '#ff9fc0');
  }
  off = bp * PX_PER_BEAT;
  [[GROUND + 7, 48, 0], [GROUND + 15, 64, 19], [GROUND + 25, 80, 41]].forEach(([y, gap, shift]) => {
    for (let k = Math.floor((off - shift) / gap) - 1; k * gap + shift - off < W; k++) {
      rect(Math.round(k * gap + shift - off), y, 8 + Math.floor(hash(k * 7 + y) * 10), 1, '#b05acb');
    }
  });

  // foreground palms standing at the shoreline
  off = bp * PX_PER_BEAT * 0.8;
  for (let k = Math.floor((off - 80) / 150); k * 150 + 70 - off < W + 30; k++) {
    const x = Math.round(k * 150 + 70 - off), lean = posMod(k, 2) ? 1 : -1;
    for (let i = 0; i < 44; i++) rect(x + Math.round(lean * i * i / 400), GROUND - i, 3, 1, '#0d0420');
    const tx = x + 1 + Math.round(lean * 44 * 44 / 400), ty = GROUND - 44;
    rect(tx - 10, ty, 21, 2, '#0d0420'); rect(tx - 8, ty - 2, 17, 2, '#0d0420'); // crown of fronds
    rect(tx - 6, ty + 2, 13, 2, '#0d0420'); rect(tx - 13, ty + 2, 3, 3, '#0d0420'); rect(tx + 11, ty + 2, 3, 3, '#0d0420');
    rect(tx - 3, ty - 4, 7, 2, '#0d0420');
  }
}

// ball height at a given beat, plus how squashed it is (1 = just touching a pad)
function ballAt(beat, P = S.path) {
  let i = 0;
  while (i < P.length - 1 && P[i + 1].beat <= beat) i++;
  const a = P[i], b = P[Math.min(i + 1, P.length - 1)];
  const d = b.beat - a.beat;
  const u = d > 0 ? Math.max(0, Math.min(1, (beat - a.beat) / d)) : 0;
  const arc = 4 * Math.min(40, 8 + 18 * d) * u * (1 - u);
  const near = Math.min(Math.abs(beat - a.beat), Math.abs(b.beat - beat));
  return { y: a.y + (b.y - a.y) * u - arc - 6, squash: Math.max(0, 1 - near / 0.12) };
}

const JUDGE_COL = { perfect: C.yel, good: C.white, bad: '#b79cff', miss: C.red };
const padCol = r => (extra && r !== 'miss' ? judgeCol(r) : JUDGE_COL[r]);

// P and bx are only overridden by the menu demo
function drawBounce(bp, P = S.path, bx = BALL_X) {
  const xOf = b => bx + (b - bp) * PX_PER_BEAT;
  const demo = P !== S.path;

  // pads
  for (const p of P) {
    const x = xOf(p.beat);
    if (x < -16 || x > W + 16) continue;
    let col = p.virt ? '#5a4a88' : (p.note && p.note.judged ? padCol(p.note.result) : C.cyan);
    if (demo && Math.abs(bp - p.beat) < 0.1) col = C.white; // pad lights up as the ball lands
    g.globalAlpha = 0.25; rect(x, p.y + 4, 1, Math.max(0, 150 - p.y), col); g.globalAlpha = 1; // support beam
    rect(x - 12, p.y, 24, 3, col);
    rect(x - 10, p.y + 3, 20, 1, '#12062a');
  }

  // trail, then the ball
  for (let k = 9; k >= 1; k--) {
    const b = bp - k * 0.05;
    g.globalAlpha = 0.55 - k * 0.055;
    const r = k > 6 ? 2 : k > 3 ? 3 : 4;
    disc(xOf(b), ballAt(b, P).y, r, r, C.cyan);
  }
  g.globalAlpha = 1;
  const { y, squash } = ballAt(bp, P);
  const ry = 6 - Math.round(squash * 2), rx = 6 + Math.round(squash * 2), by = y + Math.round(squash * 2);
  if (!demo) { S.ball.x = bx; S.ball.y = by; }
  disc(bx, by, rx, ry, C.cyan);
  disc(bx, by, rx - 2, Math.max(2, ry - 2), C.white);
}

// ---------- menu demos: the game select thumbnails play along with the menu melody ----------
const DEMO_Y = 150; // the bounce demo's pad height

// pads for the bounce demo: a hop on every beat during the intro, then one pad per melody note
function demoPath(b) {
  const from = b - 3, to = b + 6, pads = new Map();
  for (let i = Math.max(0, Math.ceil(from)); i < 16 && i <= to; i++) pads.set(i, { beat: i, virt: true });
  for (const n of Theme.notesBetween(from, to)) pads.set(n.beat, { beat: n.beat });
  const path = [...pads.values()].sort((p, q) => p.beat - q.beat);
  if (!path.length) path.push({ beat: Math.floor(from), virt: true });
  for (const p of path) p.y = DEMO_Y + Math.round(3 * Math.sin(p.beat * 0.9));
  return path;
}


// ---------- perfect chains ----------
// A chain is a run of at least CHAIN_MIN landings, each within CHAIN_GAP beats of the last (the quick hops).
// Land every one of them Perfect, with no stray taps in between, for a celebration.
const CHAIN_GAP = 0.5, CHAIN_MIN = 3;

function buildBounceChains() {
  S.chains = [];
  let cur = [];
  const flush = () => {
    if (cur.length >= CHAIN_MIN) {
      const chain = { notes: cur, tainted: false, done: false };
      for (const n of cur) n.chain = chain;
      S.chains.push(chain);
    }
    cur = [];
  };
  for (const n of S.resp) {
    if (cur.length && n.beat - cur[cur.length - 1].beat > CHAIN_GAP) flush();
    cur.push(n);
  }
  flush();
}

// a stray tap while a chain is in progress spoils it
function taintBounceChain(bp) {
  for (const chain of S.chains) {
    if (bp >= chain.notes[0].beat - 0.4 && bp <= chain.notes[chain.notes.length - 1].beat + 0.4) chain.tainted = true;
  }
}

// fireworks from the ball, a popup and a camera shake
function bounceChainFx() {
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, sp = 45 + (i % 4) * 26;
    parts.push({ x: S.ball.x, y: S.ball.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 15, life: 0.7 + (i % 3) * 0.1, col: [C.yel, C.white, C.cyan, C.mag][i % 4] });
  }
  S.shake = 0.3;
  pops.push({ t: 'PERFECT CHAIN!', col: C.yel, life: 0.9, sub: '', x: 190, y: 58 });
}
