'use strict';
// Mode 1, Call & Response: the two robots, round timing and the perfect-bar celebration.

// ---------- characters ----------
function makeBot(cx, col) { return { cx, col, hit: 0, arm: 0, sad: 0 }; }
const cpu = makeBot(75, C.cyan);
const player = makeBot(245, C.mag);

function triggerBot(b, idx) {
  b.hit = 1;
  b.arm ^= 1;
  burst(b.cx + (b.arm ? 10 : -10), 135, b.col, 7);
}

function drawBot(b, bp, active) {
  const base = 152;
  const frac = ((bp % 1) + 1) % 1;
  const bob = Math.round(Math.pow(1 - frac, 3) * 2);
  const flash = b.hit > 0.5;

  // pad
  const padCol = flash ? C.white : (active ? b.col : '#4a3a7a');
  rect(b.cx - 15, base - 7, 30, 7, '#12062a');
  rect(b.cx - 15, base - 7, 30, 2, padCol);
  rect(b.cx - 15, base - 7, 2, 7, padCol);
  rect(b.cx + 13, base - 7, 2, 7, padCol);

  // arms (drumsticks)
  for (let a = 0; a < 2; a++) {
    const down = b.hit > 0.3 && b.arm === a;
    const ax = b.cx + (a ? 11 : -14);
    const top = base - 30 + bob + (down ? 14 : 0);
    rect(ax, top, 3, 12, b.col);
    rect(ax - (a ? 0 : 1), top + 12, 4, 3, flash && down ? C.white : C.yel);
  }

  // body
  outlined(b.cx - 9, base - 26 + bob, 18, 12, b.col, C.dark);
  rect(b.cx - 2, base - 22 + bob, 4, 4, active ? b.col : '#4a3a7a');

  // head
  const hy = base - 42 + bob;
  outlined(b.cx - 10, hy, 20, 14, b.col, C.dark);
  const ec = flash ? C.white : b.col;
  if (b.sad > 0) {
    for (const ex of [-6, 3]) { rect(b.cx + ex, hy + 4, 1, 1, C.red); rect(b.cx + ex + 2, hy + 4, 1, 1, C.red); rect(b.cx + ex + 1, hy + 5, 1, 1, C.red); rect(b.cx + ex, hy + 6, 1, 1, C.red); rect(b.cx + ex + 2, hy + 6, 1, 1, C.red); }
    rect(b.cx - 3, hy + 10, 6, 1, C.red);
  } else {
    rect(b.cx - 6, hy + 4, 3, 4, ec);
    rect(b.cx + 3, hy + 4, 3, 4, ec);
    rect(b.cx - 3, hy + 10, 6, 1, flash ? C.white : '#8a7ab0');
  }
  // antenna
  rect(b.cx, hy - 5, 1, 5, b.col);
  rect(b.cx - 1, hy - 8, 3, 3, frac < 0.3 ? C.white : b.col);
}

function updateBot(b, dt) {
  b.hit = Math.max(0, b.hit - dt * 7);
  b.sad = Math.max(0, b.sad - dt);
}

function inResponsePhase(bp) {
  const c = ((bp % 8) + 8) % 8;
  return bp >= 3.6 && c >= 3.6 && c < 7.6;
}

// call & response: every note of a round was Perfect - fireworks from your bot, confetti from above, camera shake
function perfectBarFx() {
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, sp = 50 + (i % 4) * 25;
    parts.push({ x: player.cx, y: 112, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0.8 + (i % 3) * 0.1, col: [C.yel, C.white, C.mag, C.cyan][i % 4] });
  }
  for (let i = 0; i < 60; i++) {
    parts.push({ x: Math.random() * W, y: -4 - Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 50, life: 1.4 + Math.random() * 0.5, col: [C.yel, C.mag, C.cyan, C.grn, C.white][i % 5] });
  }
  S.shake = 0.35;
  pops.push({ t: 'PERFECT BAR!', col: C.yel, life: 0.9, sub: '', x: 160, y: 54 });
}

