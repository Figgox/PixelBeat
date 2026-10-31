'use strict';
// Drawing and storage helpers: localStorage, the 320x180 canvas, the pixel font, shapes, particles and popups.

// ---------- storage ----------
function load(k, d) { try { const v = localStorage.getItem('pixelbeat.' + k); return v === null ? d : +v; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem('pixelbeat.' + k, v); } catch (e) {} }

// ---------- canvas ----------
const low = document.createElement('canvas');
low.width = W; low.height = H;
const g = low.getContext('2d');
const view = document.getElementById('screen');
const vg = view.getContext('2d');
const scan = document.createElement('canvas');
scan.width = view.width; scan.height = view.height;
{
  const s = scan.getContext('2d');
  s.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < scan.height; y += 3) s.fillRect(0, y, scan.width, 1);
}

// ---------- 3x5 pixel font ----------
const FONT = {};
{
  // readable table: 5 rows of 3 chars
  const t = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'], N: ['###', '#.#', '#.#', '#.#', '#.#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '###', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
    6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'], '.': ['...', '...', '...', '...', '.#.'],
    ':': ['...', '.#.', '...', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'], '?': ['##.', '..#', '.#.', '...', '.#.'],
    '+': ['...', '.#.', '###', '.#.', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
    '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
    "'": ['.#.', '.#.', '...', '...', '...'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
    ',': ['...', '...', '...', '.#.', '#..'], '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'],
  };
  t.N = ['#..#', '##.#', '#.##', '#..#', '#..#']; // 4 wide so it can't be mistaken for D or M
  for (const k in t) FONT[k] = { w: t[k][0].length, rows: t[k] };
}

function text(str, x, y, col, s = 1, align = 'left') {
  str = String(str).toUpperCase();
  const adv = ch => ((FONT[ch] ? FONT[ch].w : 3) + 1) * s;
  const w = [...str].reduce((a, ch) => a + adv(ch), 0) - s;
  x = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  g.fillStyle = col;
  for (const ch of str) {
    const gl = FONT[ch];
    if (gl) gl.rows.forEach((row, ry) => {
      for (let rx = 0; rx < gl.w; rx++) if (row[rx] === '#') g.fillRect(x + rx * s, y + ry * s, s, s);
    });
    x += adv(ch);
  }
}

function rect(x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); }
function outlined(x, y, w, h, line, fill) { rect(x, y, w, h, line); rect(x + 1, y + 1, w - 2, h - 2, fill); }

function hex(c) { return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
function mix(a, b, k) {
  const A = hex(a), B = hex(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')';
}

// ---------- particles / popups ----------
let parts = [], pops = [];
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 60;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.5, col });
  }
}
function updateParts(dt) {
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const p of pops) p.life -= dt;
  pops = pops.filter(p => p.life > 0);
}
function drawParts() {
  for (const p of parts) { g.globalAlpha = Math.min(1, p.life * 3); rect(p.x, p.y, 2, 2, p.col); }
  g.globalAlpha = 1;
  for (const p of pops) {
    const k = 1 - p.life / 0.7;
    g.globalAlpha = Math.min(1, p.life * 4);
    const px = p.x === undefined ? 245 : p.x, py = p.y === undefined ? 88 : p.y;
    text(p.t, px + 1, py + 1 - k * 14, '#2b0a52', 2, 'center'); // drop shadow keeps it readable over the sun
    text(p.t, px, py - k * 14, p.col, 2, 'center');
    if (p.sub) text(p.sub, px, py + 13 - k * 14, p.col, 1, 'center');
  }
  g.globalAlpha = 1;
}

// large centred text with a dark drop shadow so it stays readable over the sun
function bigText(str, x, y, col, s) {
  const o = Math.ceil(s / 4);
  for (const [dx, dy] of [[o, o], [-o, o], [o, -o], [-o, -o], [o, 0], [-o, 0], [0, o], [0, -o]]) text(str, x + dx, y + dy, '#2b0a52', s, 'center');
  text(str, x, y, col, s, 'center');
}

function hash(i) { // small deterministic 0..1 noise so the scenery is the same every run
  let h = Math.imul(i + 0x7f4a7c15, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const posMod = (a, n) => ((a % n) + n) % n;

function disc(cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry)));
    g.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1);
  }
}

function diamond(x, y, r, col) {
  g.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) { const hw = r - Math.abs(dy); g.fillRect(Math.round(x - hw), Math.round(y + dy), hw * 2 + 1, 1); }
}

