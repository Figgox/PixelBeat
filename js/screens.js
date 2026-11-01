'use strict';
// Screens: HUD, title, menu, settings, calibration, play and results drawing, plus the glow pass.

function drawHud(bp) {
  text('SCORE ' + String(S.score).padStart(6, '0'), 6, 6, C.white, 1);
  if (extra) text('EXTRA ' + EXTRA_BPM[mode] + ' BPM', 6, 14, C.yel, 1);
  if (S.combo >= 3) text(S.combo + (mode === 3 ? ' RALLY' : ' COMBO'), W - 6, 6, C.yel, 1, 'right');
  rect(0, 0, W, 2, '#1d1038');
  rect(0, 0, Math.round(W * Math.max(0, Math.min(1, bp / S.endBeat))), 2, C.cyan);

  const c = ((bp % 8) + 8) % 8;
  if (paused) {
    // the pause menu owns the centre of the screen
  } else if (S.done) {
    text('FINISH!', 160, 30, C.yel, 3, 'center');
  } else if (bp < 0) {
    // count-in: READY (beat -5), 3, 2, 1, then GO! on the beat before the first call
    const stage = Math.floor(bp) + 5, frac = bp - Math.floor(bp);
    if (stage <= 0) bigText('READY', 160, 26, C.white, frac < 0.15 ? 5 : 4);
    else if (stage <= 3) bigText(String(4 - stage), 160, 16, C.white, frac < 0.15 ? 10 : 8);
    else bigText('GO!', 160, 16, C.grn, frac < 0.15 ? 10 : 8);
  } else if (mode === 1) {
    if (bp < 6) text('TAP WHEN IT LANDS', 160, 22, C.cyan, 1, 'center');
  } else if (mode === 2) {
    if (bp < 8) text('LEFT: < OR A     RIGHT: > OR D', 160, 22, C.cyan, 1, 'center');
  } else if (mode === 3) {
    if (bp < 8) text('HIT IT BACK AS IT REACHES YOUR PADDLE', 160, 22, C.cyan, 1, 'center');
  } else if (c < 4) {
    text('LISTEN', 160, 24, C.cyan, 2, 'center');
  } else {
    text('YOUR TURN', 160, 24, C.mag, 2, 'center');
  }
  // beat pips under the active bot
  if (mode === 0 && bp >= 0 && !S.done) {
    const bot = c < 4 ? cpu : player;
    const cur = Math.floor(c) % 4;
    for (let i = 0; i < 4; i++) rect(bot.cx - 14 + i * 8, 160, 6, 3, i <= cur ? bot.col : '#2a1a4a');
  }
}

function drawLogo() {
  text('PIXEL', 160 + 1, 2 + 1, C.mag, 7, 'center');
  text('PIXEL', 160, 2, C.cyan, 7, 'center');
  text('BEAT', 160 + 1, 42 + 1, C.cyan, 7, 'center'); // a few pixels of air between the two words
  text('BEAT', 160, 42, C.mag, 7, 'center');
}

function drawTitle() {
  const bp = menuT / SPB;
  drawBackground(bp);
  drawBot(cpu, bp, true);
  drawBot(player, bp + 0.5, true);
  drawLogo();
  if (Math.floor(menuT * 2) % 2 === 0) text('PRESS ANY KEY', 160, 100, C.white, 2, 'center');
}

// main menu: the logo and robots, with PLAY and SETTINGS between them
function drawMenu() {
  const bp = menuBeat(), settings = menuSel === 1;
  if (settings) drawGearBackground(bp); else drawBackground(bp);
  if (menuFlash > 0) { g.globalAlpha = menuFlash * 0.7; rect(0, 0, W, H, '#000'); g.globalAlpha = 1; } // quick dip when the backdrop changes
  if (!settings) { // the robots stay with PLAY; SETTINGS shows only the gears
    drawBot(cpu, bp, true);
    drawBot(player, bp + 0.5, true);
  }
  drawParts();
  drawLogo();

  const rows = menuRows();
  g.globalAlpha = 0.65; rect(108, 89, 104, rows.length > 2 ? 54 : 41, '#07030f'); g.globalAlpha = 1; // stays clear of the robots on either side
  rows.forEach((r, i) => {
    const sel = i === menuSel, hw = (r.label.length * 8 - 2) / 2;
    let col = sel ? C.yel : C.white;
    if (i === EXTRA_ITEM) { // the glowing EXTRA option
      const pulse = 0.5 + 0.5 * Math.sin(menuT * 5);
      g.globalAlpha = 0.12 + 0.28 * pulse; rect(r.x, r.y - 3, r.w, 15, C.mag); g.globalAlpha = 1;
      if (!sel) col = mix(C.yel, C.white, pulse);
    }
    text(r.label, 160, r.y, col, 2, 'center');
    if (sel) { text('>', 160 - hw - 12, r.y, C.yel, 2); text('<', 160 + hw + 6, r.y, C.yel, 2); }
  });
  g.globalAlpha = 0.65; rect(0, 156, W, 24, '#07030f'); g.globalAlpha = 1;
  text(MENU_HINT[menuSel], 160, 159, '#b79cff', 1, 'center');
  text('OFFSET ' + signed(offsetMs) + ' MS  <LEFT/RIGHT>', 160, 169, '#8a7ab0', 1, 'center');
}

// ---------- game select ----------
// Each thumbnail is a live 1:1 crop of its game's scene (x, y: the crop's top left), playing along with the menu theme.
const THUMBS = [
  { x: 124, y: 76, draw: bp => { drawBackground(bp); drawBot({ ...cpu, cx: 142 }, bp, true); drawBot({ ...player, cx: 178 }, bp + 0.5, true); } },
  { x: 140, y: 84, draw: bp => { drawBounceBackground(bp); drawBounce(bp, demoPath(bp), 162); } },
  { x: 124, y: 92, draw: bp => { drawTwinBackground(bp); drawTwinDemo(bp, 160, 130, 10); } },
  { x: 124, y: 76, draw: bp => { drawPongBackground(bp, false); drawPong(bp, pongDemoShots(bp), PONG_MINI); } },
];

function drawThumb(i, x, y, bp) {
  const t = THUMBS[i];
  g.save();
  g.beginPath(); g.rect(x, y, CARD_W, CARD_H); g.clip();
  g.translate(x - t.x, y - t.y);
  if (isLockedMode(i)) { // nothing of the game shows through, just a padlock
    drawLockedBackground(bp);
    drawPadlock(t.x + CARD_W / 2 - 10, t.y + CARD_H / 2 - 12, 3, '#8a7ab0');
  } else t.draw(bp);
  g.restore();
}

function drawSelect() {
  const bp = menuBeat();
  drawBackground(bp);
  g.globalAlpha = 0.6; rect(0, 0, W, H, '#05020c'); g.globalAlpha = 1;
  const title = extra ? 'EXTRA GAMES' : 'SELECT GAME';
  text(title, 161, 9, C.mag, 2, 'center');
  text(title, 160, 8, C.cyan, 2, 'center');
  text('< BACK', 6, 6, '#8a7ab0', 1);

  gameCards().forEach((c, i) => {
    const sel = i === modeSel, locked = isLockedMode(i), y = c.y - (sel ? 2 : 0); // the highlighted card lifts a little
    drawThumb(i, c.x, y, bp);
    if (!sel) { g.globalAlpha = 0.5; rect(c.x, y, c.w, c.h, '#05020c'); g.globalAlpha = 1; }
    else if (menuFlash > 0) { g.globalAlpha = menuFlash * 0.4; rect(c.x, y, c.w, c.h, C.white); g.globalAlpha = 1; }
    g.strokeStyle = sel ? C.yel : '#4a3a7a'; g.lineWidth = 1;
    g.strokeRect(c.x - 0.5, y - 0.5, c.w + 1, c.h + 1);
    if (!locked && curRanks()[i] >= 0) { // best rank so far, in the corner
      const r = RANKS[curRanks()[i]], w = r.length * 4 + 3;
      rect(c.x + c.w - w - 2, y + 2, w, 9, '#07030f');
      text(r, c.x + c.w - 4, y + 4, RANK_COL[r], 1, 'right');
    }
    text(c.title, c.x + c.w / 2, c.y + c.h + 5, locked ? (sel ? '#8a7ab0' : '#4a3a7a') : (sel ? C.yel : '#b79cff'), 1, 'center');
  });

  if (modeSel >= PLAYABLE) text('THIS MODE IS STILL IN THE WORKS.', 160, 134, '#b79cff', 1, 'center');
  else if (!isUnlocked(modeSel)) {
    const msg = 'GET A C OR BETTER IN ' + MODES[modeSel - 1] + '.', x0 = 160 - Math.round((msg.length * 4 - 1) / 2);
    drawPadlock(x0 - 11, 133, 1, '#ff6b8a');
    text(msg, x0, 134, '#ff6b8a', 1);
  } else {
    text(MODE_HINT[modeSel], 160, 134, '#b79cff', 1, 'center');
    text((extra ? EXTRA_BPM[modeSel] + ' BPM (NORMAL ' + MODE_BPM[modeSel] + ')   ' : '') + 'BEST ' + curBests()[modeSel], 160, 146, extra ? C.yel : '#8a7ab0', 1, 'center');
  }
  text('<LEFT/RIGHT> CHOOSE    SPACE: PLAY    ESC: BACK', 160, 168, '#8a7ab0', 1, 'center');
}

// ---------- settings and calibration screens ----------
function drawSettings() {
  const bp = menuBeat();
  drawGearBackground(bp);
  g.globalAlpha = 0.35; rect(0, 0, W, H, '#000'); g.globalAlpha = 1;
  text('SETTINGS', 160, 12, C.white, 3, 'center');
  settingsButtons().forEach((b, i) => {
    const sel = i === settingsSel;
    rect(b.x, b.y, b.w, b.h, sel ? '#2b0a52' : '#0a0418');
    g.strokeStyle = sel ? C.yel : C.pur; g.lineWidth = 1;
    g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    text(b.label, b.x + b.w / 2, b.y + 5, sel ? C.yel : C.white, 1, 'center');
  });
  text(delayLine(), 160, 136, '#b79cff', 1, 'center');
  text('CALIBRATE: TAP ALONG TO A CLICK TO MEASURE YOUR DELAY.', 160, 146, '#8a7ab0', 1, 'center');
  text('RESET DELAY: OFFSET 0, BROWSER LATENCY ONLY.', 160, 154, '#8a7ab0', 1, 'center');
  drawToast(168);
}

function drawCalibration() {
  const now = Snd.ctx.currentTime - Snd.latency;
  rect(0, 0, W, H, '#05010d');
  const beat = (now - cal.C0) / CAL_SPB, pulse = cal.phase === 'run' && beat >= 0 ? Math.pow(1 - posMod(beat, 1), 3) : 0;
  g.globalAlpha = 0.25 + pulse * 0.5; disc(160, 88, 22 + Math.round(pulse * 8), 22 + Math.round(pulse * 8), '#7a2cff'); g.globalAlpha = 1;
  disc(160, 88, 10, 10, cal.phase === 'run' && beat >= CAL_COUNT_IN ? C.cyan : '#5a4a88');
  text('CALIBRATION', 160, 10, C.cyan, 3, 'center');

  if (cal.phase === 'ready') {
    if (cal.first) text("WELCOME! FIRST, LET'S SYNC YOUR AUDIO.", 160, 28, C.yel, 1, 'center');
    text('TAP ALONG WITH THE CLICK', 160, cal.first ? 40 : 30, C.white, 1, 'center');
    text('SPACE, ARROW KEYS, A/D, OR CLICK', 160, cal.first ? 50 : 40, '#8a7ab0', 1, 'center');
    text('LISTEN TO FOUR CLICKS, THEN TAP ON', 160, 126, '#b79cff', 1, 'center');
    text('EACH OF THE NEXT SIXTEEN.', 160, 134, '#b79cff', 1, 'center');
    if (Math.floor(menuT * 2) % 2 === 0) text('PRESS SPACE TO START', 160, 150, C.white, 1, 'center');
    text(cal.first ? 'ESC: SKIP FOR NOW (REDO IT ANYTIME IN SETTINGS)' : 'ESC: BACK', 160, 166, '#8a7ab0', 1, 'center');
  } else if (cal.phase === 'run') {
    const inCount = beat < CAL_COUNT_IN;
    text(inCount ? 'LISTEN...' : 'TAP ON EVERY CLICK!', 160, 30, inCount ? C.white : C.yel, 2, 'center');
    text(cal.taps.length + ' / ' + CAL_BEATS, 160, 126, C.white, 1, 'center');
    if (cal.last !== null) {
      const m = Math.round(Math.abs(cal.last));
      text(m < 4 ? 'ON THE CLICK' : m + ' MS ' + (cal.last < 0 ? 'EARLY' : 'LATE'), 160, 140, cal.last < 0 ? C.cyan : C.mag, 1, 'center');
    }
    text(cal.first ? 'ESC: SKIP' : 'ESC: CANCEL', 160, 166, '#8a7ab0', 1, 'center');
    if (cal.nextBeat >= CAL_COUNT_IN + CAL_BEATS && now > cal.C0 + (CAL_COUNT_IN + CAL_BEATS) * CAL_SPB) finishCalibration();
  } else if (cal.result) {
    const m = Math.round(Math.abs(cal.result.avg));
    text('YOU TAP ' + (m < 4 ? 'RIGHT ON THE CLICK' : m + ' MS ' + (cal.result.avg < 0 ? 'EARLY' : 'LATE')), 160, 30, C.white, 1, 'center');
    text('NEW OFFSET: ' + signed(cal.result.offset) + ' MS', 160, 120, C.yel, 2, 'center');
    text('(CURRENT: ' + signed(offsetMs) + ' MS)', 160, 138, '#8a7ab0', 1, 'center');
    text('SPACE: SAVE    R: TRY AGAIN    ESC: ' + (cal.first ? 'SKIP' : 'CANCEL'), 160, 156, C.white, 1, 'center');
  } else {
    text('NOT ENOUGH TAPS - TRY AGAIN', 160, 30, C.red, 1, 'center');
    text('R: TRY AGAIN    ESC: ' + (cal.first ? 'SKIP' : 'BACK'), 160, 150, C.white, 1, 'center');
  }
}

function drawPlay() {
  const bp = beatAt(visClock() - S.T0);
  g.save();
  if (S.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 6 * S.shake * 4), Math.round((Math.random() - 0.5) * 4 * S.shake * 4)); // scene shake; the HUD stays put
  if (mode === 1) drawBounceBackground(bp); else if (mode === 2) drawTwinBackground(bp);
  else if (mode === 3) drawPongBackground(bp, S.combo >= 10, S.smashBeat); else drawBackground(bp);
  const c = ((bp % 8) + 8) % 8;
  if (mode === 0) {
    drawBot(cpu, bp, bp >= 0 && c < 4);
    drawBot(player, bp, bp >= 0 && c >= 4);
  } else if (mode === 1) {
    drawBounce(bp);
  } else if (mode === 2) {
    drawTwin(bp);
  } else {
    drawPong(bp, S.shots, PONG_GEO, S.swing);
  }
  drawParts();
  g.restore();
  drawHud(bp);
  if (paused) {
    g.globalAlpha = 0.6; rect(0, 0, W, H, '#000'); g.globalAlpha = 1;
    text(pauseView === 'main' ? 'PAUSED' : 'OPTIONS', 160, 24, C.white, 3, 'center');
    pauseButtons().forEach((b, i) => {
      const sel = i === pauseSel;
      rect(b.x, b.y, b.w, b.h, sel ? '#2b0a52' : '#0a0418'); // opaque, so the sun never shows through
      g.strokeStyle = sel ? C.yel : C.pur; g.lineWidth = 1;
      g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      text(b.label, b.x + b.w / 2, b.y + 6, sel ? C.yel : C.white, 1, 'center');
    });
    text(delayLine(), 160, 140, '#b79cff', 1, 'center');
    text('UP/DOWN + SPACE   ESC: BACK', 160, 162, '#8a7ab0', 1, 'center');
    drawToast(151);
  }
}

function drawResult() {
  const bp = menuT / SPB;
  if (mode === 1) drawBounceBackground(bp); else if (mode === 2) drawTwinBackground(bp);
  else if (mode === 3) drawPongBackground(bp, false); else drawBackground(bp); // the backdrop of the game you just played
  const acc = accuracy(), rank = rankOf(acc);
  g.globalAlpha = 0.75; rect(40, 14, 240, 152, '#07030f'); g.globalAlpha = 1;
  g.strokeStyle = C.mag; g.lineWidth = 1; g.strokeRect(40.5, 14.5, 239, 151);
  text('RESULTS', 160, 22, C.cyan, 2, 'center');
  const rc = rank === 'S+' ? [C.yel, C.cyan, C.mag][Math.floor(menuT * 6) % 3]
    : RANK_COL[rank];
  text(rank, 78, 52, rc, 8, 'center'); // ends at y=92, clear of the PERFECT/GOOD rows below
  text('SCORE ' + S.score, 220, 46, C.white, 1, 'center');
  text('ACCURACY ' + Math.round(acc * 100) + '%', 220, 56, C.white, 1, 'center');
  text('MAX COMBO ' + S.maxCombo, 220, 66, C.white, 1, 'center');
  text('BEST ' + curBests()[mode], 220, 76, '#b79cff', 1, 'center');
  if (S.unlockMsg) text('NEW MODE UNLOCKED: ' + S.unlockMsg + '!', 160, 36, [C.grn, C.yel][Math.floor(menuT * 4) % 2], 1, 'center');
  else text(MODES[mode] + (extra ? ' EXTRA' : ''), 160, 36, extra ? C.yel : '#8a7ab0', 1, 'center');
  const rows = [['PERFECT', 'perfect', HIT_COL], ['GOOD', 'good', HIT_COL], ['OK', 'bad', HIT_COL], ['MISS', 'miss', C.red]];
  rows.forEach((r, i) => {
    text(r[0], 100, 100 + i * 8, r[2], 1);
    text(S.counts[r[1]], 220, 100 + i * 8, r[2], 1, 'right');
  });
  const ad = avgDelta();
  if (ad !== null) {
    const m = Math.round(Math.abs(ad));
    text('AVG TIMING: ' + (m < 3 ? 'ON BEAT' : m + ' MS ' + (ad < 0 ? 'EARLY' : 'LATE')), 160, 136, C.white, 1, 'center');
    if (S.applied) text('OFFSET NOW ' + (offsetMs >= 0 ? '+' : '') + offsetMs + ' MS', 160, 145, C.grn, 1, 'center');
    else if (m >= 3) text(mode === 1 ? 'TO FIX YOUR DELAY: CALIBRATE IN SETTINGS' : 'O: APPLY AS OFFSET', 160, 145, C.yel, 1, 'center');
  }
  text('SPACE: CONTINUE    R: RETRY', 160, 156, C.white, 1, 'center');
}

let appliedFilter = '';
function present() {
  // EXTRA's colour scheme is a hue shift on the finished picture; the EXTRA menu row previews it
  const want = extra || (scene === 'menu' && menuSel === EXTRA_ITEM) ? EXTRA_FILTER : '';
  if (want !== appliedFilter) { view.style.transition = 'filter 0.25s'; view.style.filter = appliedFilter = want; }
  vg.globalCompositeOperation = 'source-over';
  vg.globalAlpha = 1;
  vg.filter = 'none';
  vg.imageSmoothingEnabled = false;
  vg.drawImage(low, 0, 0, view.width, view.height);
  // neon bloom
  vg.save();
  vg.imageSmoothingEnabled = true;
  vg.globalCompositeOperation = 'lighter';
  vg.filter = 'blur(5px)';
  vg.globalAlpha = 0.75;
  vg.drawImage(low, 0, 0, view.width, view.height);
  vg.filter = 'blur(14px)';
  vg.globalAlpha = 0.5;
  vg.drawImage(low, 0, 0, view.width, view.height);
  vg.restore();
  vg.drawImage(scan, 0, 0);
}

