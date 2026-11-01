'use strict';
// Main loop: per-frame update and the animation frame driver. Loaded last.

let last = performance.now();

function update(dt) {
  menuFlash = Math.max(0, menuFlash - dt * 5);
  toast.life -= dt;
  updateBot(cpu, dt);
  updateBot(player, dt);
  updateParts(dt);
  if (S.flash) {
    S.flash[0] = Math.max(0, S.flash[0] - dt * 6);
    S.flash[1] = Math.max(0, S.flash[1] - dt * 6);
    for (const r of S.rings) r.t += dt;
    S.rings = S.rings.filter(r => r.t < 0.35);
    S.shake = Math.max(0, (S.shake || 0) - dt);
  }
  if ((scene === 'menu' || scene === 'settings') && Theme.running) {
    for (const n of Theme.takeDue()) {
      if (scene !== 'menu' || isLockedMode(modeSel)) continue; // settings and locked games just drain the queue
      const side = n.who === 'cpu' ? 0 : 1;
      if (modeSel === 0) triggerBot(side ? player : cpu, n.idx);
      else if (modeSel === 1) burst(DEMO_X, DEMO_Y - 6, side ? C.mag : C.cyan, 6);          // the ball lands on a pad
      else if (modeSel === 2) { demoFlash[side] = 1; burst(160 + (side ? 8 : -8), DEMO_Y, side ? C.mag : C.cyan, 6); }
    }
  }
  demoFlash[0] = Math.max(0, demoFlash[0] - dt * 6);
  demoFlash[1] = Math.max(0, demoFlash[1] - dt * 6);
  if (scene !== 'play' || paused) return;

  const bp = (visClock() - S.T0) / SPB;
  for (const c of S.calls) if (!c.done && c.beat <= bp) { c.done = true; triggerBot(cpu, c.idx); }

  const judgeBeat = (pressClock() - S.T0) / SPB;
  for (const n of S.resp) if (!n.judged && (judgeBeat - n.beat) * SPB > W_BAD) missNote(n);

  if (!S.done && bp >= S.endBeat) {
    S.done = true;
    S.doneAt = performance.now();
    stopGame();
    const B = curBests(), R = curRanks(), pre = extra ? 'x' : '';
    B[mode] = Math.max(B[mode], S.score);
    save(pre + (mode || extra ? 'best' + mode : 'best'), B[mode]);
    const nextWasLocked = !extra && mode + 1 < PLAYABLE && !isUnlocked(mode + 1);
    const extraWasLocked = !extra && !extraUnlocked();
    R[mode] = Math.max(R[mode], RANKS.indexOf(rankOf(accuracy())));
    save(pre + 'rank' + mode, R[mode]);
    // announced on the results screen
    S.unlockMsg = nextWasLocked && isUnlocked(mode + 1) ? MODES[mode + 1] : extraWasLocked && extraUnlocked() ? 'EXTRA' : null;
  }
  if (S.done && performance.now() - S.doneAt > 1500) { scene = 'result'; S.resultAt = performance.now(); }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  menuT += dt;
  update(dt);
  g.globalAlpha = 1;
  if (scene === 'title') drawTitle();
  else if (scene === 'menu') drawMenu();
  else if (scene === 'settings') drawSettings();
  else if (scene === 'calibrate') drawCalibration();
  else if (scene === 'play') drawPlay();
  else drawResult();
  present();
}
requestAnimationFrame(frame);

