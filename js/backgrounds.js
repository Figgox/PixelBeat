'use strict';
// The shared sun, skyline and perspective-grid backdrop (menus, results and Call & Response).

// ---------- background ----------
const skyBands = [];
for (let y = 0; y < HORIZON; y += 4) skyBands.push(mix('#06020e', '#4a0f66', Math.pow(y / HORIZON, 2)));
const stars = [];
{
  let s = 12345;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 45; i++) stars.push({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * 70), p: rnd() * 6 });
}
const skyline = [];
{
  let s = 777, x = 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  while (x < W) {
    const w = 10 + Math.floor(rnd() * 16), h = 8 + Math.floor(rnd() * 26);
    skyline.push({ x, w, h, win: Math.floor(rnd() * 4) });
    x += w;
  }
}

function drawBackground(bp) {
  const frac = ((bp % 1) + 1) % 1;
  const pulse = Math.pow(1 - frac, 3);
  skyBands.forEach((c, i) => rect(0, i * 4, W, 4, c));

  const tms = performance.now() / 1000;
  for (const s of stars) {
    const on = Math.sin(tms * 2 + s.p) > -0.3;
    rect(s.x, s.y, 1, 1, on ? '#cfc0ff' : '#5a4a88');
  }

  // sun
  const r = 30 + Math.round(pulse * 2), cy = 70;
  for (let dy = -r; dy < r; dy++) {
    if (dy > 2 && ((dy + 40) % 7) < Math.floor(dy / 9) + 1) continue;
    const hw = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(160 - hw, cy + dy, hw * 2, 1, mix('#fff200', '#ff2bd6', (dy + r) / (2 * r)));
  }

  // skyline
  for (const b of skyline) {
    rect(b.x, HORIZON - b.h, b.w - 1, b.h, '#0b0418');
    rect(b.x, HORIZON - b.h, b.w - 1, 1, '#3a1d6e');
    for (let k = 0; k < b.win; k++) rect(b.x + 2 + k * 4, HORIZON - b.h + 4 + (k % 2) * 6, 1, 2, k % 2 ? C.cyan : C.mag);
  }

  // floor
  for (let y = HORIZON; y < H; y += 4) rect(0, y, W, 4, mix('#12062a', '#05020c', (y - HORIZON) / 80));
  rect(0, HORIZON, W, 1, C.mag);
  g.globalAlpha = 0.45 + pulse * 0.4;
  for (let k = -14; k <= 14; k++) {
    for (let y = HORIZON + 1; y < H; y++) rect(160 + k * 42 * ((y - HORIZON) / 80), y, 1, 1, C.pur);
  }
  const scroll = (bp * 0.5) % 1;
  for (let i = 0; i < 8; i++) {
    const z = (i + scroll) / 8;
    rect(0, Math.round(HORIZON + z * z * 80), W, 1, C.mag);
  }
  g.globalAlpha = 1;
}


// ---------- padlock ----------
const LOCK_SPRITE = ['..###..', '.#...#.', '.#...#.', '#######', '#######', '###.###', '###.###', '#######']; // 7x8
function drawPadlock(x, y, s, col) {
  g.fillStyle = col;
  LOCK_SPRITE.forEach((row, ry) => {
    for (let rx = 0; rx < 7; rx++) if (row[rx] === '#') g.fillRect(Math.round(x + rx * s), Math.round(y + ry * s), s, s);
  });
}

// the menu backdrop for a game you haven't unlocked yet: rows of padlocks sliding past, nothing of the game visible
function drawLockedBackground(bp) {
  for (let y = 0; y < H; y += 4) rect(0, y, W, 4, mix('#05010d', '#1a0838', y / H));
  // the whole lattice drifts up and to the left; it repeats every two cells so the loop has no jump
  const pulse = Math.pow(1 - posMod(bp, 1), 3), cell = 20, period = cell * 2;
  // move in whole pixels, one step across and one up at the same moment: moving x and y at different
  // rates made the two axes step at different times, which looked like jiggling
  const step = Math.floor(menuT * 5), sx = step % period, sy = step % period;
  for (let row = 0; row < Math.ceil(H / cell) + 3; row++) {
    const stagger = row % 2 ? cell / 2 : 0; // every other row is shifted half a cell
    for (let col = -2; col < Math.ceil(W / cell) + 4; col++) {
      g.globalAlpha = 0.16 + pulse * 0.1;
      drawPadlock(col * cell + stagger - sx, row * cell - sy + 6, 1, (row + col) % 2 ? '#8a2be2' : '#ff2bd6');
    }
  }
  g.globalAlpha = 1;
}

// ---------- gears ----------
// one pixel-art gear, drawn per pixel so it can turn: teeth around the rim, a hole in the middle
function drawGear(cx, cy, R, teeth, rot, col) {
  g.fillStyle = col;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > R || r < R * 0.3) continue;
      if (r > R * 0.72 && Math.cos(teeth * (Math.atan2(dy, dx) + rot)) < 0) continue; // gaps between the teeth
      g.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
    }
  }
}

// the backdrop for the settings: a lattice of slowly turning gears drifting down and to the right
function drawGearBackground(bp) {
  for (let y = 0; y < H; y += 4) rect(0, y, W, 4, mix('#04060d', '#0b1c38', y / H));
  const pulse = Math.pow(1 - posMod(bp, 1), 3), cell = 28, period = cell * 2;
  const step = Math.floor(menuT * 5), s = step % period; // whole pixels, same moment on both axes
  for (let row = -2; row < Math.ceil(H / cell) + 1; row++) {
    const stagger = row % 2 ? cell / 2 : 0;
    for (let col = -2; col < Math.ceil(W / cell) + 3; col++) {
      const dir = (row + col) % 2 ? 1 : -1; // neighbours turn opposite ways, like meshing gears
      g.globalAlpha = 0.2 + pulse * 0.1;
      drawGear(col * cell + stagger + s, row * cell + s + 14, 7, 8, dir * menuT * 0.35, (row + col) % 2 ? '#00a8c8' : '#3a7ae0');
    }
  }
  g.globalAlpha = 1;
}
