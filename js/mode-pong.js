'use strict';
// Mode 4, Ping Pong: the rally chart, the ball's flight, the arena backdrop, table and paddles, smashes, menu demo.

// Where everything sits: your hitting point (left) and the bot's (right), the table top and its ends, the floor,
// net height and how high the ball arcs. The menu thumbnail uses a smaller copy of the same table.
const PONG_GEO = { youX: 56, cpuX: 264, hitY: 118, tableY: 136, tableL: 72, tableR: 248, floorY: 166, net: 8, arc: 1 };
const PONG_MINI = { youX: 132, cpuX: 188, hitY: 120, tableY: 132, tableL: 138, tableR: 182, floorY: 152, net: 5, arc: 0.5 };
const PONG_RING = false; // the approach ring around your paddle; off while trying the game without it

// Reads the chart into shots ({ beat, who: 0 bot / 1 you, smash, lob }) and checks it keeps a playable rally.
// The bot's shot before each smash is a lob: a high, slow ball that sets you up.
function parsePongChart() {
  const shots = [];
  [...PONG_BARS.join('')].forEach((ch, j) => { if (ch !== '.') shots.push({ beat: j / 2, who: ch === 'c' ? 0 : 1, smash: ch === 'P' }); });
  shots.forEach((s, k) => {
    const prev = shots[k - 1], next = shots[k + 1];
    s.lob = !!next && next.smash;
    if (k === 0 ? s.who !== 0 : s.who === prev.who || s.beat - prev.beat > 2) console.warn('ping pong: the rally breaks at beat', s.beat);
    else if (s.who === 1 && s.beat - prev.beat < PONG_MIN_INCOMING) console.warn('ping pong: the ball reaches you too fast at beat', s.beat);
    if (s.smash && next && next.beat - s.beat !== 0.5) console.warn('ping pong: a smash must be returned half a beat later, beat', s.beat);
    if (s.smash && (posMod(s.beat, 1) !== 0.5 || s.beat - prev.beat < 1.5)) console.warn('ping pong: a smash must land off the beat after a lob of 1.5+ beats, beat', s.beat);
  });
  PONG_BARS.forEach((bar, j) => { // both tunes need exactly one entry per hit in each bar
    for (const [who, re, tune] of [['your', /[pP]/g, PONG_MELODY], ["the bot's", /c/g, PONG_BOT_MELODY]]) {
      const hits = (bar.match(re) || []).length, notes = (tune[j] || '').split(' ').filter(Boolean).length;
      if (hits !== notes) console.warn('ping pong: bar', j + 1, 'has', hits, who, 'hits but', notes, 'notes');
    }
  });
  return shots;
}

// Your shots become the notes; the bot's shots and the bounces on your half are scheduled as sound.
// Each shot's ball bounces halfway to the next shot, which is the cue for the hit that follows.
function buildPongRally() {
  S.shots = parsePongChart();
  S.bounceMap = new Map(); // half-beat step -> the bounces on your half that fall within it
  let i = 0, j = 0;
  S.shots.forEach((sh, k) => {
    const next = S.shots[k + 1];
    sh.bounce = next ? (sh.beat + next.beat) / 2 : sh.beat + 0.5; // after the last shot nobody returns it
    if (sh.who === 0) {
      S.callMap.set(sh.beat * 2, j++); // its entry in PONG_BOT_TUNE
      const st = Math.floor(sh.bounce * 2);
      S.bounceMap.set(st, [...(S.bounceMap.get(st) || []), sh.bounce]);
    } else {
      sh.note = { beat: sh.beat, from: S.shots[k - 1].beat, idx: i++, judged: false, smash: sh.smash, bounce: sh.bounce }; // idx: its note in PONG_TUNE
      S.resp.push(sh.note);
    }
  });
}

// One flight from xa (at beat ta) to xb (at beat tb), hit by shot: an arc down onto the far half of the table halfway
// in time, then up to the other paddle; a smash flies flat, a lob climbs high. Past tb the ball keeps going and falls,
// for a ball that nobody returns.
function pongPath(xa, xb, ta, tb, t, geo, shot) {
  const mid = (ta + tb) / 2, xm = xa + 0.7 * (xb - xa), low = geo.tableY - 2, d = tb - ta;
  const H = geo.arc * (shot.smash ? 6 : shot.lob ? Math.min(56, 4 + 28 * d) : Math.min(36, 4 + 18 * d));
  if (t < mid) {
    const u = (t - ta) / (mid - ta);
    return { x: xa + (xm - xa) * u, y: geo.hitY + (low - geo.hitY) * u - 4 * H * u * (1 - u) };
  }
  const u = (t - mid) / (tb - mid);
  return { x: xm + (xb - xm) * u, y: low + (geo.hitY - low) * u - 2.4 * H * u * (1 - u) };
}

// the ball at beat bp, or null before the serve; lost = beats since it got past you
function pongBall(bp, shots, geo) {
  let i = -1;
  while (i + 1 < shots.length && shots[i + 1].beat <= bp) i++;
  if (i < 0) return null;
  const a = shots[i], b = shots[i + 1], xOf = s => (s.who ? geo.youX : geo.cpuX);
  if (a.note && (!a.note.judged || a.note.result === 'miss')) { // not hit (yet): it carries on past your paddle
    const p = shots[i - 1];
    return { ...pongPath(xOf(p), xOf(a), p.beat, a.beat, bp, geo, p), lost: bp - a.beat };
  }
  if (!b) return { ...pongPath(xOf(a), a.who ? geo.cpuX : geo.youX, a.beat, a.beat + 1, bp, geo, a), smash: a.smash }; // the winner sails off
  return { ...pongPath(xOf(a), xOf(b), a.beat, b.beat, bp, geo, a), smash: a.smash };
}

function drawPaddle(x, y, col, swing, dir) { // dir 1 faces right; the blade jabs toward the table on a swing
  const px = Math.round(x - dir * 5 + dir * 4 * swing), lit = swing > 0.5;
  rect(px - 1, y + 6, 3, 7, '#ffb347'); // handle
  disc(px, y, 4, 7, lit ? C.white : col);
  disc(px, y, 2, 5, lit ? col : '#12062a');
}

// An arena: ceiling lamps over the table, three rows of fans that bob on the beat (and cheer when cheer is set),
// a scrolling LED board and a lit floor. For two beats after smashBeat the whole crowd jumps on the beat.
function drawPongBackground(bp, cheer, smashBeat = -99) {
  const pulse = Math.pow(1 - posMod(bp, 1), 3);
  for (let y = 0; y < 100; y += 4) rect(0, y, W, 4, mix('#03010a', '#1a0838', y / 100));
  g.globalAlpha = 0.06 + pulse * 0.05;
  for (const lx of [100, 220]) for (let y = 12; y < 166; y++) { const hw = 3 + (y - 12) * 0.35; rect(lx - hw, y, hw * 2, 1, '#bfe8ff'); }
  g.globalAlpha = 1;

  [[34, 9, '#0d0620', '#2e1a5c'], [50, 10, '#120829', '#3d2475'], [66, 11, '#170b33', '#4f2f94']].forEach(([y, gap, col, rim], row) => {
    for (let k = 0, x = row * 4 - 6; x < W + 6; k++, x += gap) {
      const h = hash(k * 7 + row * 131);
      const since = bp - smashBeat - h * 0.15, hype = since > 0 && since < 2; // each fan takes off a moment apart
      const top = y - Math.round(pulse * 2 * h) - (hype ? Math.round(Math.abs(Math.sin(since * Math.PI)) * 8) : 0);
      const lit = hype ? mix(rim, '#ff9be6', 0.75) : rim; // the cheering crowd glows
      rect(x - 3, top + 5, 7, 22, col); // shoulders and body, long enough that a jump never shows a gap below
      rect(x - 2, top, 5, 5, col); // head, lit from above by the lamps
      rect(x - 1, top, 3, 1, lit); rect(x - 3, top + 5, 7, 1, lit);
      if (hype || (cheer && h > 0.4)) { rect(x - 4, top - 3, 1, 7, col); rect(x + 4, top - 3, 1, 7, col); } // arms up
      if (hype) { rect(x - 4, top - 4, 1, 1, '#ffd36b'); rect(x + 4, top - 4, 1, 1, '#ffd36b'); } // hands in the light
      if (h > 0.93 && Math.sin(menuT * 3 + k) > 0) rect(x + 2, top + 7, 1, 2, '#e8f6ff'); // a phone screen
    }
  });
  for (const lx of [100, 220]) { rect(lx - 6, 8, 12, 4, '#2a1d4a'); rect(lx - 4, 12, 8, 1, '#e8f6ff'); }

  rect(0, 86, W, 14, '#07030f'); rect(0, 86, W, 1, '#3a1d6e'); rect(0, 99, W, 1, '#3a1d6e');
  const ad = 'PIXEL BEAT  +  PING PONG  +  ', aw = ad.length * 4;
  g.globalAlpha = 0.5 + pulse * 0.3;
  for (let x = -posMod(bp * 16, aw); x < W; x += aw) text(ad, x, 91, Math.floor(bp / 4) % 2 ? C.mag : C.cyan, 1);
  g.globalAlpha = 1;

  for (let y = 100; y < H; y += 4) rect(0, y, W, 4, mix('#120828', '#05020c', (y - 100) / (H - 100)));
  g.globalAlpha = 0.1 + pulse * 0.05; disc(160, 168, 110, 9, '#bfe8ff'); g.globalAlpha = 1;
}

// the table, paddles and ball; shots and geo are only overridden by the menu demo, youSwing by the game
function drawPong(bp, shots = S.shots, geo = PONG_GEO, youSwing) {
  const demo = shots !== S.shots, net = (geo.tableL + geo.tableR) / 2;
  for (const lx of [geo.tableL + 6, geo.tableR - 8]) rect(lx, geo.tableY + 3, 2, geo.floorY - geo.tableY - 3, '#2a1d4a');
  rect(geo.tableL, geo.tableY, geo.tableR - geo.tableL, 3, '#0b2f7a');
  rect(geo.tableL, geo.tableY, geo.tableR - geo.tableL, 1, '#7fd8ff');
  g.globalAlpha = 0.45;
  for (let y = geo.tableY - geo.net; y < geo.tableY; y += 2) rect(net - 1, y, 3, 1, C.white);
  g.globalAlpha = 1;
  rect(net, geo.tableY - geo.net - 1, 1, geo.net + 1, C.white);

  // a ring that closes in on your paddle over the last beat before your next hit (yellow for a smash)
  const n = demo ? null : S.resp.find(o => !o.judged), d = n ? n.beat - bp : -1;
  if (PONG_RING && d > 0 && d < 1) {
    const r = 5 + d * 16;
    g.globalAlpha = 1 - d * 0.7;
    for (let a = 0; a < Math.PI * 2; a += 0.12) rect(geo.youX + Math.cos(a) * r, geo.hitY + Math.sin(a) * r, 1, 1, n.smash ? C.yel : C.mag);
    g.globalAlpha = 1;
  }
  // a smash on its way: a "!" bubble beside your paddle from the bot's shot until you hit it, popping on every beat
  if (n && n.smash && bp >= n.from) {
    const bx = geo.youX - 20, by = geo.hitY - 10, r = posMod(bp, 1) < 0.15 ? 10 : 9;
    disc(bx, by, r, r, C.yel); // a yellow rim round a dark bubble, so the glow lifts the "!" instead of drowning it
    disc(bx, by, r - 2, r - 2, '#2b0a52');
    text('!', bx, by - 5, C.yel, 2, 'center');
  }

  const swingOf = who => { // 1 right at that side's latest hit, gone a quarter beat later
    let last = null;
    for (const s of shots) { if (s.beat > bp) break; if (s.who === who) last = s; }
    return last ? Math.max(0, 1 - (bp - last.beat) / 0.25) : 0;
  };
  const faceOf = x => (x < net ? 1 : -1); // paddles face the table
  drawPaddle(geo.cpuX, geo.hitY, C.cyan, swingOf(0), faceOf(geo.cpuX));
  drawPaddle(geo.youX, geo.hitY, C.mag, youSwing === undefined ? swingOf(1) : youSwing, faceOf(geo.youX));

  // waiting for the serve, the ball bounces on the bot's paddle in time
  const ball = pongBall(bp, shots, geo) || { x: geo.cpuX + 2 * faceOf(geo.cpuX), y: geo.hitY - 4 - Math.round(Math.abs(Math.sin(bp * Math.PI)) * 8) };
  const fade = ball.lost === undefined ? 1 : Math.max(0, 1 - ball.lost * 2);
  if (ball.x > geo.tableL && ball.x < geo.tableR && fade === 1) { g.globalAlpha = 0.5; rect(ball.x - 2, geo.tableY + 1, 5, 1, '#000'); }
  for (let k = ball.smash ? 8 : 4; k >= 1; k--) {
    const p = pongBall(bp - k * 0.03, shots, geo);
    if (!p) continue;
    g.globalAlpha = fade * (ball.smash ? 0.6 - k * 0.06 : 0.45 - k * 0.1);
    disc(p.x, p.y, 1, 1, ball.smash ? C.red : '#ffd9a0');
  }
  g.globalAlpha = fade;
  disc(ball.x, ball.y, 2, 2, ball.smash ? C.red : '#fff3e0');
  g.globalAlpha = 1;
}

// your hit: the return bounces on the bot's half (as sound), and a smash that lands Good or better gets a show
function pongHit(n, j) {
  const t = S.T0 + beatTime(n.bounce);
  if (t > Snd.ctx.currentTime) Snd.tock(t);
  if (n.smash && j !== 'bad') smashFx();
}

// a red-hot streak toward the bot, sparks off your paddle, a popup, a jolt, and the crowd on its feet
function smashFx() {
  S.smashBeat = beatAt(visClock() - S.T0);
  Snd.cheer(Snd.ctx.currentTime);
  const toward = PONG_GEO.cpuX > PONG_GEO.youX ? 0 : Math.PI; // the angle pointing at the bot
  for (let i = 0; i < 30; i++) {
    const a = toward + (Math.random() - 0.5) * 1.6, sp = 60 + Math.random() * 90;
    parts.push({ x: PONG_GEO.youX, y: PONG_GEO.hitY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0.6 + Math.random() * 0.3, col: [C.red, C.yel, C.white][i % 3] });
  }
  S.shake = 0.25;
  pops.push({ t: 'SMASH!', col: C.red, life: 0.9, sub: '', x: 160, y: 40 });
}

// menu demo: a steady rally on the theme's beat, the sides taking turns
function pongDemoShots(bp) {
  const shots = [];
  for (let b = Math.max(0, Math.floor(bp) - 2); b <= Math.floor(bp) + 2; b++) shots.push({ beat: b, who: b % 2 });
  return shots;
}
