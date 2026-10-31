// Tiny Web Audio synth. Everything is generated, no sample files.
const Snd = (() => {
  let ctx, master, noise;
  let uiCtx, uiMaster; // menu sounds get their own context, so they still play while the game clock is paused
  const SCALE = [440, 523.25, 587.33, 659.25, 783.99, 880]; // A minor pentatonic

  function init() {
    if (!uiCtx) {
      uiCtx = new (window.AudioContext || window.webkitAudioContext)();
      uiMaster = uiCtx.createGain();
      uiMaster.gain.value = 0.8;
      uiMaster.connect(uiCtx.destination);
    }
    if (uiCtx.state === 'suspended') uiCtx.resume();
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(comp);
      comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // gain node with a fast attack and exponential decay
  function envGain(t, attack, peak, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  function tone(type, freq, t, attack, peak, decay, dest) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = envGain(t, attack, peak, decay);
    o.connect(g);
    g.connect(dest || master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }

  function noiseHit(t, filterType, freq, q, peak, decay) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = envGain(t, 0.002, peak, decay);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.05);
  }

  function lowpassed(freq) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.connect(master);
    return f;
  }

  // a short blip on the menu context; delay is in seconds
  function uiTone(type, freq, delay, peak, decay) {
    if (!uiCtx) return;
    const t = uiCtx.currentTime + delay, o = uiCtx.createOscillator(), g = uiCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + decay);
    o.connect(g);
    g.connect(uiMaster);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  return {
    init,
    setVolume(v) { if (master) master.gain.value = v; if (uiMaster) uiMaster.gain.value = v; },

    uiMove() { uiTone('triangle', 720, 0, 0.14, 0.05); },
    uiSelect() { uiTone('square', 660, 0, 0.07, 0.07); uiTone('square', 990, 0.06, 0.07, 0.1); },
    uiBack() { uiTone('triangle', 520, 0, 0.14, 0.06); uiTone('triangle', 390, 0.06, 0.14, 0.08); },
    click(t) { tone('square', 1200, t, 0.001, 0.3, 0.03, lowpassed(6000)); }, // sharp marker for calibration
    get ctx() { return ctx; },
    get latency() { return ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0; },

    kick(t) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const g = envGain(t, 0.002, 0.9, 0.28);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.35);
    },
    hat(t) { noiseHit(t, 'highpass', 7000, 0.7, 0.12, 0.04); },
    clap(t) { noiseHit(t, 'bandpass', 1800, 1, 0.3, 0.12); },

    bass(t, freq, dur) {
      const f = lowpassed(420);
      tone('sawtooth', freq, t, 0.005, 0.4, dur, f);
    },

    pad(t, freqs, dur) {
      const f = lowpassed(1100);
      for (const fr of freqs) {
        for (const det of [-7, 7]) {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = fr;
          o.detune.value = det;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.035, t + 0.08);
          g.gain.setValueAtTime(0.035, t + dur - 0.1);
          g.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(g);
          g.connect(f);
          o.start(t);
          o.stop(t + dur + 0.05);
        }
      }
    },

    // the melody note both the bot and the player play; same idx = same pitch
    pluck(t, idx, who, scale = SCALE) {
      const freq = scale[idx % scale.length];
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(5000, t);
      f.frequency.exponentialRampToValueAtTime(900, t + 0.25);
      f.connect(master);
      if (who === 'cpu') {
        tone('square', freq, t, 0.004, 0.2, 0.24, f);
      } else {
        tone('sawtooth', freq, t, 0.004, 0.2, 0.26, f);
        tone('triangle', freq * 2, t, 0.004, 0.1, 0.18, f);
      }
    },

    tick(t) { tone('sine', 1500, t, 0.002, 0.16, 0.05); }, // soft marker for each bounce landing
    beep(t, freq) { tone('square', freq, t, 0.003, 0.18, 0.12, lowpassed(3000)); },

    buzz(t) {
      const f = lowpassed(400);
      const o = tone('sawtooth', 90, t, 0.003, 0.3, 0.15, f);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.15);
    },
  };
})();
