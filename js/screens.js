'use strict';
// Screens: HUD, title, menu, settings, calibration, play and results drawing, plus the glow pass.

function drawHud(bp) {
  text('SCORE ' + String(S.score).padStart(6, '0'), 6, 6, C.white, 1);
  if (S.combo >= 3) text(S.combo + ' COMBO', W - 6, 6, C.yel, 1, 'right');
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

function drawMenu() {
  const bp = menuBeat();
  // the backdrop previews whichever mode is highlighted; a locked one shows only drifting padlocks
  const lockedSel = isLockedMode(modeSel);
  if (lockedSel) drawLockedBackground(bp);
  else if (modeSel === SETTINGS_ROW) drawGearBackground(bp);
  else if (modeSel === 1) drawBounceBackground(bp);
  else if (modeSel === 2) drawTwinBackground(bp);
  else drawBackground(bp);
  if (menuFlash > 0) { g.globalAlpha = menuFlash * 0.7; rect(0, 0, W, H, '#000'); g.globalAlpha = 1; } // quick dip when the selection changes
  if (lockedSel) {
    // nothing of the game shows through
  } else if (modeSel === 1) {
    drawBounce(bp, demoPath(bp), DEMO_X);
  } else if (modeSel === 2) {
    drawTwinDemo(bp);
  } else if (modeSel === 0) { // the robots belong to Call & Response; Settings (row 3) shows only the gears
    drawBot(cpu, bp, true);
    drawBot(player, bp + 0.5, true);
  }
  drawParts();
  drawLogo();

  if (!lockedSel && Math.floor(menuT * 2) % 2 === 0) text(modeSel === SETTINGS_ROW ? 'PRESS SPACE TO OPEN' : 'PRESS SPACE TO START', 160, 82, C.white, 2, 'center');
  g.globalAlpha = 0.65; rect(98, 103, 124, 41, '#07030f'); g.globalAlpha = 1; // stays clear of the robots on either side
  [...MODES, 'SETTINGS'].forEach((m, i) => {
    const sel = i === modeSel, y = i === SETTINGS_ROW ? 135 : 107 + i * 9;
    const isMode = i < MODES.length, locked = isLockedMode(i);
    const col = locked ? (sel ? '#8a7ab0' : '#4a3a7a') : (sel ? C.yel : C.white);
    text((sel ? '> ' : '  ') + m, 102, y, col, 1);
    if (locked) drawPadlock(211, y - 1, 1, col); // a padlock where the best rank would be
    else if (isMode && bestRanks[i] >= 0) text(RANKS[bestRanks[i]], 218, y, RANK_COL[RANKS[bestRanks[i]]], 1, 'right'); // best rank so far
  });
  g.globalAlpha = 0.65; rect(0, 156, W, 24, '#07030f'); g.globalAlpha = 1;
  if (modeSel === SETTINGS_ROW) text('DELAY, VOLUME AND CALIBRATION.', 160, 159, '#b79cff', 1, 'center');
  else if (modeSel >= PLAYABLE) text('THIS MODE IS STILL IN THE WORKS.', 160, 159, '#b79cff', 1, 'center');
  else if (!isUnlocked(modeSel)) {
    const msg = 'GET A C OR BETTER IN ' + MODES[modeSel - 1] + '.', x0 = 160 - Math.round((msg.length * 4 - 1) / 2);
    drawPadlock(x0 - 11, 158, 1, '#ff6b8a');
    text(msg, x0, 159, '#ff6b8a', 1);
  }
  else text(MODE_HINT[modeSel], 160, 159, '#b79cff', 1, 'center');
  text('OFFSET ' + signed(offsetMs) + ' MS  <LEFT/RIGHT>' + (modeSel < MODES.length ? '   BEST ' + bests[modeSel] : ''), 160, 169, '#8a7ab0', 1, 'center');
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
  const bp = (visClock() - S.T0) / SPB;
  g.save();
  if (S.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 6 * S.shake * 4), Math.round((Math.random() - 0.5) * 4 * S.shake * 4)); // scene shake; the HUD stays put
  if (mode === 1) drawBounceBackground(bp); else if (mode === 2) drawTwinBackground(bp); else drawBackground(bp);
  const c = ((bp % 8) + 8) % 8;
  if (mode === 0) {
    drawBot(cpu, bp, bp >= 0 && c < 4);
    drawBot(player, bp, bp >= 0 && c >= 4);
  } else if (mode === 1) {
    drawBounce(bp);
  } else {
    drawTwin(bp);
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
  drawBackground(bp);
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
  text('BEST ' + bests[mode], 220, 76, '#b79cff', 1, 'center');
  if (S.unlockMsg) text('NEW MODE UNLOCKED: ' + S.unlockMsg + '!', 160, 36, [C.grn, C.yel][Math.floor(menuT * 4) % 2], 1, 'center');
  else text(MODES[mode], 160, 36, '#8a7ab0', 1, 'center');
  const rows = [['PERFECT', 'perfect', C.yel], ['GOOD', 'good', C.cyan], ['OK', 'bad', '#b79cff'], ['MISS', 'miss', C.red]];
  rows.forEach((r, i) => {
    text(r[0], 100, 100 + i * 8, r[2], 1);
    text(S.counts[r[1]], 220, 100 + i * 8, r[2], 1, 'right');
  });
  const ad = avgDelta();
  if (ad !== null) {
    const m = Math.round(Math.abs(ad));
    text('AVG TIMING: ' + (m < 3 ? 'ON BEAT' : m + ' MS ' + (ad < 0 ? 'EARLY' : 'LATE')), 160, 136, C.white, 1, 'center');
    if (S.applied) text('OFFSET NOW ' + (offsetMs >= 0 ? '+' : '') + offsetMs + ' MS', 160, 145, C.grn, 1, 'center');
    else if (m >= 3) text('O: APPLY AS OFFSET', 160, 145, C.yel, 1, 'center');
  }
  text('SPACE: CONTINUE    R: RETRY', 160, 156, C.white, 1, 'center');
}

function present() {
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

