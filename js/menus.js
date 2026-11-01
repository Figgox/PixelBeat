'use strict';
// Menu logic: entering the menu, pause menu, settings screen and delay calibration.

function enterMenu() {
  Snd.init();
  Snd.setVolume(volume);
  Snd.uiSelect();
  if (needsCalibration) { openCalibration(true); return; } // first launch: sync the delay before anything else
  scene = 'menu';
  Theme.start();
}
// back from a game (results or quit) to the game select screen
function goMenu() {
  scene = 'select';
  setTempo(0); // the menu theme is always at the first mode's tempo
  Theme.start();
}
const menuBeat = () => (Theme.running ? Theme.beat() : menuT / SPB);

// pointer position in screen pixels (320x180)
function screenPos(e) {
  const r = view.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
const inBox = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

// ---------- main menu and game select ----------
const menuRows = () => MENU_ITEMS.map((label, i) => ({ label, x: 108, y: 98 + i * 16, w: 104, h: 10 }));
const CARD_W = 72, CARD_H = 80, CARD_GAP = 6;
const CARD_X0 = Math.round((W - MODES.length * (CARD_W + CARD_GAP) + CARD_GAP) / 2); // the row of cards is centred
const gameCards = () => MODES.map((title, i) => ({ title, x: CARD_X0 + i * (CARD_W + CARD_GAP), y: 30, w: CARD_W, h: CARD_H }));
const BACK_BTN = { x: 0, y: 0, w: 44, h: 18 };

function moveSelection(dir) {
  if (scene === 'menu') menuSel = (menuSel + MENU_ITEMS.length + dir) % MENU_ITEMS.length;
  else modeSel = (modeSel + MODES.length + dir) % MODES.length;
  menuFlash = 1;
  Snd.uiMove();
}

// a tap on a row or card picks it and opens it straight away
function menuPointer(e) {
  const p = screenPos(e);
  if (scene === 'menu') {
    const i = menuRows().findIndex(b => inBox(p, { ...b, y: b.y - 4, h: b.h + 8 }));
    if (i >= 0) { menuSel = i; onAction(e); }
  } else if (inBox(p, BACK_BTN)) {
    Snd.uiBack();
    scene = 'menu';
  } else {
    const i = gameCards().findIndex(b => inBox(p, { ...b, h: b.h + 14 })); // the title under the thumbnail counts too
    if (i >= 0) { modeSel = i; onAction(e); }
  }
}

// ---------- pause menu ----------
let pauseView = 'main', pauseSel = 0;
const PAUSE_ITEMS = ['RESUME', 'RETRY', 'OPTIONS', 'QUIT'];
const signed = n => (n >= 0 ? '+' : '') + n;

// ----- settings shared by the pause options and the settings screen -----
let toast = { text: '', life: 0 };
const showToast = text => { toast = { text, life: 2 }; };
function drawToast(y) { if (toast.life > 0) text(toast.text, 160, y, C.grn, 1, 'center'); }

function adjustOffset(dir) {
  offsetMs = Math.max(-200, Math.min(200, offsetMs + dir * 5));
  save('offset', offsetMs);
  Snd.uiMove();
}
function adjustVolume(dir) {
  volume = Math.max(0, Math.min(1, Math.round((volume + dir * 0.1) * 10) / 10));
  save('volume', volume);
  Snd.setVolume(volume);
  Snd.uiMove();
}
// back to the browser's own estimate of output latency, with no manual offset on top
function resetDelay() {
  offsetMs = 0;
  save('offset', 0);
  showToast('DELAY RESET TO BROWSER STANDARD');
  Snd.uiSelect();
}
const delayLine = () => 'BROWSER LATENCY ' + Math.round(Snd.latency * 1000) + ' MS   OFFSET ' + signed(offsetMs) + ' MS';

function pauseButtons() {
  const labels = pauseView === 'main' ? PAUSE_ITEMS : [
    '< OFFSET ' + signed(offsetMs) + ' MS >',
    '< VOLUME ' + Math.round(volume * 100) + '% >',
    'RESET DELAY',
    'BACK',
  ];
  return labels.map((label, i) => ({ label, x: 85, y: 50 + i * 19, w: 150, h: 15 }));
}

function adjustOption(dir) {
  if (pauseView !== 'options') return;
  if (pauseSel === 0) adjustOffset(dir);
  else if (pauseSel === 1) adjustVolume(dir);
}

function activatePause(i) {
  pauseSel = i;
  if (pauseView === 'main') {
    Snd.uiSelect();
    if (i === 0) togglePause(false);
    else if (i === 1) { Snd.ctx.resume(); startGame(); }
    else if (i === 2) { pauseView = 'options'; pauseSel = 0; }
    else { stopGame(); Snd.ctx.resume(); paused = false; goMenu(); }
  } else if (i === 2) resetDelay();
  else if (i === 3) { Snd.uiBack(); pauseView = 'main'; pauseSel = 2; }
}

function pauseKey(k) {
  const n = pauseButtons().length;
  if (k === 'ArrowUp') { pauseSel = (pauseSel + n - 1) % n; Snd.uiMove(); }
  else if (k === 'ArrowDown') { pauseSel = (pauseSel + 1) % n; Snd.uiMove(); }
  else if (k === 'ArrowLeft') adjustOption(-1);
  else if (k === 'ArrowRight') adjustOption(1);
  else if (k === 'Space' || k === 'Enter') activatePause(pauseSel);
  else if (k === 'Escape') {
    Snd.uiBack();
    if (pauseView === 'options') { pauseView = 'main'; pauseSel = 2; } else togglePause(false);
  }
}

function pausePointer(e) {
  const p = screenPos(e);
  pauseButtons().forEach((b, i) => {
    if (!inBox(p, b)) return;
    if (pauseView === 'options' && i < 2) { pauseSel = i; adjustOption(p.x < b.x + b.w / 2 ? -1 : 1); }
    else activatePause(i);
  });
}

// ---------- settings screen (from the main menu) ----------
let settingsSel = 0;
function settingsButtons() {
  const labels = [
    '< OFFSET ' + signed(offsetMs) + ' MS >',
    '< VOLUME ' + Math.round(volume * 100) + '% >',
    'CALIBRATE DELAY',
    'RESET DELAY',
    'BACK',
  ];
  return labels.map((label, i) => ({ label, x: 85, y: 38 + i * 18, w: 150, h: 14 }));
}
function activateSetting(i) {
  settingsSel = i;
  if (i === 2) { Snd.uiSelect(); openCalibration(); }
  else if (i === 3) resetDelay();
  else if (i === 4) { Snd.uiBack(); scene = 'menu'; }
}
function adjustSetting(dir) {
  if (settingsSel === 0) adjustOffset(dir);
  else if (settingsSel === 1) adjustVolume(dir);
}
function settingsKey(k) {
  const n = settingsButtons().length;
  if (k === 'ArrowUp') { settingsSel = (settingsSel + n - 1) % n; Snd.uiMove(); }
  else if (k === 'ArrowDown') { settingsSel = (settingsSel + 1) % n; Snd.uiMove(); }
  else if (k === 'ArrowLeft') adjustSetting(-1);
  else if (k === 'ArrowRight') adjustSetting(1);
  else if (k === 'Space' || k === 'Enter') activateSetting(settingsSel);
  else if (k === 'Escape') { Snd.uiBack(); scene = 'menu'; }
}
function settingsPointer(e) {
  const p = screenPos(e);
  settingsButtons().forEach((b, i) => {
    if (!inBox(p, b)) return;
    if (i < 2) { settingsSel = i; adjustSetting(p.x < b.x + b.w / 2 ? -1 : 1); }
    else activateSetting(i);
  });
}

// ---------- delay calibration ----------
// Tap along to a steady click. The average gap between your taps and the clicks (after the same latency
// correction the game uses) becomes the offset that cancels your setup's remaining delay.
const CAL_SPB = 0.5, CAL_COUNT_IN = 4, CAL_BEATS = 16;
const cal = { phase: 'ready', C0: 0, nextBeat: 0, taps: [], result: null, timer: 0, last: null, first: false };

// first = the automatic run on a player's first launch (leaves to the main menu and is never shown again)
function openCalibration(first = false) {
  Theme.stop(); // the menu music would drown out the click
  stopCalibrationAudio();
  Object.assign(cal, { phase: 'ready', taps: [], result: null, last: null, first });
  scene = 'calibrate';
}
function startCalibration() {
  Snd.init();
  Object.assign(cal, { phase: 'run', C0: Snd.ctx.currentTime + 0.8, nextBeat: 0, taps: [], result: null, last: null });
  clearInterval(cal.timer);
  cal.timer = setInterval(() => {
    const horizon = Snd.ctx.currentTime + 0.15, total = CAL_COUNT_IN + CAL_BEATS;
    while (cal.nextBeat < total && cal.C0 + cal.nextBeat * CAL_SPB < horizon) {
      const t = cal.C0 + cal.nextBeat * CAL_SPB;
      Snd.click(t);
      if (cal.nextBeat % 4 === 0) Snd.kick(t);
      cal.nextBeat++;
    }
  }, 25);
}
function stopCalibrationAudio() { clearInterval(cal.timer); cal.timer = 0; }

// raw press time, without the player's offset, in the same terms the game judges taps
function rawPressClock(e) {
  let t = Snd.ctx.currentTime;
  if (e && e.timeStamp) {
    const lag = (performance.now() - e.timeStamp) / 1000;
    if (lag >= 0 && lag < 0.2) t -= lag;
  }
  return t - Snd.latency;
}
function calTap(e) {
  if (cal.phase !== 'run') return;
  const rel = (rawPressClock(e) - cal.C0) / CAL_SPB, k = Math.round(rel);
  if (k < CAL_COUNT_IN || k >= CAL_COUNT_IN + CAL_BEATS) return; // only the measured beats count
  const dev = (rel - k) * CAL_SPB * 1000; // ms, negative = early
  if (cal.taps.some(x => x.k === k)) return; // one tap per click
  cal.taps.push({ k, dev });
  cal.last = dev;
  Snd.uiMove();
}
function finishCalibration() {
  stopCalibrationAudio();
  const devs = cal.taps.map(x => x.dev).sort((a, b) => a - b);
  cal.phase = 'done';
  if (devs.length < 8) { cal.result = null; return; }
  const med = devs[Math.floor(devs.length / 2)];
  const good = devs.filter(d => Math.abs(d - med) <= 80); // ignore stray taps far from the typical timing
  const avg = good.reduce((a, b) => a + b, 0) / good.length;
  cal.result = { avg, offset: Math.max(-200, Math.min(200, Math.round(-avg))), used: good.length };
}
function leaveCalibration() {
  stopCalibrationAudio();
  if (cal.first) { // done or skipped: don't ask again, go on to the main menu
    cal.first = false;
    needsCalibration = false;
    save('calibrated', 1);
    scene = 'menu';
  } else scene = 'settings';
  Theme.start();
}
function calibrationKey(k, e) {
  if (k === 'Escape') { Snd.uiBack(); leaveCalibration(); return; }
  if (cal.phase === 'ready') { if (k === 'Space' || k === 'Enter') { Snd.uiSelect(); startCalibration(); } return; }
  if (cal.phase === 'run') { if (TAP_KEYS.includes(k)) calTap(e); return; }
  if (cal.phase === 'done') {
    if (k === 'KeyR') { Snd.uiSelect(); openCalibration(cal.first); }
    else if ((k === 'Space' || k === 'Enter') && cal.result) {
      offsetMs = cal.result.offset;
      save('offset', offsetMs);
      showToast('OFFSET SAVED: ' + signed(offsetMs) + ' MS');
      Snd.uiSelect();
      leaveCalibration();
    }
  }
}

