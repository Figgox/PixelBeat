'use strict';
// Input: taps, key presses, pointer and tab-visibility handling.

function onAction(e) {
  if (scene === 'title') { enterMenu(); return; }
  Snd.init();
  if (scene === 'menu') {
    Snd.uiSelect();
    if (menuSel === 1) { settingsSel = 0; scene = 'settings'; } else scene = 'select';
  } else if (scene === 'select') {
    if (modeSel >= PLAYABLE) return;
    if (!isUnlocked(modeSel)) Snd.buzz(Snd.ctx.currentTime);
    else { Snd.uiSelect(); mode = modeSel; startGame(); }
  } else if (scene === 'result') {
    if (performance.now() - S.resultAt < 600) return; // a late tap from the song shouldn't skip the results
    Snd.uiSelect();
    if (S.unlockMsg) modeSel = mode + 1; // land on the mode you just unlocked
    goMenu();
  } else if (scene === 'calibrate') {
    if (cal.phase === 'run') calTap(e);
    else if (cal.phase === 'ready') { Snd.uiSelect(); startCalibration(); }
    else calibrationKey(cal.result ? 'Space' : 'KeyR', e); // done: a tap saves the result, or retries if it failed
  } else if (scene === 'play') {
    if (!paused) press(e);
  }
}

addEventListener('keydown', e => {
  if (e.repeat) return;
  const k = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
  if (scene === 'title') {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) enterMenu();
  } else if (scene === 'menu') {
    if (k === 'ArrowUp') moveSelection(-1);
    else if (k === 'ArrowDown') moveSelection(1);
    else if (k === 'ArrowLeft') adjustOffset(-1);
    else if (k === 'ArrowRight') adjustOffset(1);
    else if (k === 'Space' || k === 'Enter') onAction(e);
  } else if (scene === 'select') {
    if (k === 'ArrowLeft' || k === 'KeyA') moveSelection(-1);
    else if (k === 'ArrowRight' || k === 'KeyD') moveSelection(1);
    else if (k === 'Escape' || k === 'Backspace') { Snd.uiBack(); scene = 'menu'; }
    else if (k === 'Space' || k === 'Enter') onAction(e);
  } else if (scene === 'settings') {
    settingsKey(k);
  } else if (scene === 'calibrate') {
    calibrationKey(k, e);
  } else if (scene === 'result') {
    if (k === 'Escape') { Snd.uiBack(); goMenu(); }
    else if (k === 'KeyR') { Snd.uiSelect(); startGame(); }
    else if (k === 'KeyO' && avgDelta() !== null && mode !== 1) { // Bounce timing mixes in playing habit, so it never sets the offset
      offsetMs = Math.max(-200, Math.min(200, Math.round(offsetMs - avgDelta())));
      save('offset', offsetMs);
      S.applied = true;
    } else if (k === 'Space' || k === 'Enter') onAction(e);
  } else if (scene === 'play') {
    if (paused) pauseKey(k);
    else if (k === 'Escape') togglePause();
    else if (TAP_KEYS.includes(k)) onAction(e);
  }
});
view.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (scene === 'play' && paused) pausePointer(e);
  else if (scene === 'settings') settingsPointer(e);
  else if (scene === 'menu' || scene === 'select') menuPointer(e);
  else onAction(e);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    togglePause(true);
    Theme.stop(); // timers are throttled in background tabs, so the loop would stutter
  } else if (scene === 'menu' || scene === 'select' || scene === 'settings') Theme.start();
});

