'use strict';
// Constants and level data: layout, colours, tempo, scoring, ranks, charts and chords for all three modes.

const W = 320, H = 180, HORIZON = 100;
const C = {
  cyan: '#00f0ff', mag: '#ff2bd6', yel: '#fff200', pur: '#7a2cff',
  grn: '#39ff14', red: '#ff3355', white: '#ffffff', dark: '#1a0f33',
};

// ---------- level ----------
const MODE_BPM = [120, 128, 140];
let SPB = 60 / MODE_BPM[0]; // seconds per beat; follows the current mode's tempo (see setTempo)
const setTempo = m => { SPB = 60 / MODE_BPM[m]; };
// Each round: the beats (0-3.5) within a 4-beat phrase the bot plays, then you repeat.
const ROUNDS = [
  [0, 1, 2, 3], [0, 1, 2, 3], [0, 2, 3], [0, 1, 3],
  [0, 1, 2, 2.5, 3], [0, 0.5, 1, 2], [0, 1, 1.5, 2, 3], [0, 1, 2, 3],
  [0, 0.5, 1, 2, 2.5, 3], [0, 1.5, 2, 3], [0.5, 1.5, 2.5, 3.5], [0, 0.5, 1, 1.5, 2, 3],
  [0, 1, 1.5, 2, 3, 3.5], [0, 0.5, 1, 2, 2.5, 3, 3.5], [0, 1.5, 2, 2.5, 3, 3.5],
  [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
];
const CHORDS = [
  { r: 55, n: [220, 261.63, 329.63] },
  { r: 43.65, n: [174.61, 220, 261.63] },
  { r: 65.41, n: [261.63, 329.63, 392] },
  { r: 49, n: [196, 246.94, 293.66] },
];
const W_PERF = 0.045, W_GOOD = 0.09, W_BAD = 0.15; // seconds
const POINTS = { perfect: 100, good: 60, bad: 20 };
const WEIGHT = { perfect: 1, good: 0.7, bad: 0.35, miss: 0 };
const MODES = ['CALL & RESPONSE', 'BOUNCE', 'TWIN TAP'];
const PLAYABLE = 3; // modes at or beyond this index are still "soon"
const SETTINGS_ROW = MODES.length; // the menu row after the modes opens the settings screen
// Progression: each mode unlocks once the one before it has been cleared with at least this rank.
const RANKS = ['F', 'D', 'C', 'B', 'A', 'S', 'S+'];
const UNLOCK_RANK = RANKS.indexOf('C');
const RANK_COL = { 'S+': '#fff200', S: '#fff200', A: '#39ff14', B: '#00f0ff', C: '#ff2bd6', D: '#b79cff', F: '#ff3355' };
const MODE_HINT = [
  'LISTEN TO THE BOT. THEN REPEAT IT ON THE BEAT.',
  'TAP THE MOMENT THE BALL LANDS ON EACH PAD.',
  'LEFT: < OR A   RIGHT: > OR D   HIT EACH SIDE ON BEAT.',
];

// ---------- twin tap level ----------
// One string per bar, one character per half-beat: L = left pulse, R = right pulse, B = both, . = rest.
// Rule: a left and a right note may share a beat (a double) but never sit closer than MIN_SIDE_GAP
// beats apart, so a double can't be mistaken for two near-misses. Same-side runs can be as fast as eighths.
const TWIN_BARS = [
  'L...R...', 'L.L.R.R.', 'L.R.L.R.', 'R.L.R.L.',
  'L.L.R...', 'L.R.R.L.', 'LL..RR..', 'B...B...',
  'L.R.LL..', 'LL.RR.L.', 'B.L.B.R.', 'L.R.B...',
  'LLL.RRR.', 'LL.R.RR.', 'B.B.L.R.', 'R...L...',
  'LL.RR.L.', 'B...L.R.', 'L.L.RR..', 'B.R.B.L.',
  'L.R.L.B.', 'LL.R.LL.', 'RR.LL.R.', 'B...B.B.',
];
const MIN_SIDE_GAP = 1; // beats
const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
const TAP_KEYS = ['Space', 'Enter', 'KeyC', 'KeyZ', 'KeyX', 'KeyJ', 'KeyK', 'KeyF', ...LEFT_KEYS, ...RIGHT_KEYS]; // any of these hits in the other modes
const TWIN_SCALE = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99]; // D minor pentatonic; left uses the low half
// Dm7 | Bbmaj7 | F | C7 | Gm7 | Bbmaj7 | Asus | Dm
const CHORDS_T = [
  { r: 73.42, n: [293.66, 349.23, 440, 523.25] },
  { r: 58.27, n: [233.08, 293.66, 349.23, 440] },
  { r: 87.31, n: [261.63, 349.23, 440, 523.25] },
  { r: 65.41, n: [261.63, 329.63, 392, 466.16] },
  { r: 49, n: [196, 233.08, 293.66, 349.23] },
  { r: 58.27, n: [233.08, 293.66, 349.23, 440] },
  { r: 55, n: [220, 293.66, 329.63, 392] },
  { r: 73.42, n: [293.66, 349.23, 440, 587.33] },
];
const TWIN_BASS = [1, 2, 1, 1, 2, 1, 2, 2]; // driving eighths: multiple of the chord root per half-beat step
const TWIN_PX = 60; // pixels per beat that a pulse travels

// ---------- bounce level ----------
// Landing beats (0-3.5) within each 4-beat bar.
const BOUNCE_BARS = [
  [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 2, 3],
  [0, 1, 2, 3], [0, 1, 1.5, 2, 3], [0, 2, 2.5, 3], [0, 1, 2, 3],
  [0, 0.5, 1, 2, 3], [0, 1, 2, 2.5, 3], [0, 1.5, 2, 3.5], [0, 1, 2, 3],
  [0, 0.5, 1, 1.5, 2, 3], [0, 1, 1.5, 2, 2.5, 3], [0, 1, 2, 2.5, 3, 3.5], [0, 2],
  [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 1, 2, 3], [0, 0.5, 1, 2, 2.5, 3], [0, 1.5, 2, 3],
  [0, 0.5, 1, 1.5, 2, 2.5, 3], [0, 1, 1.5, 2, 3, 3.5], [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0, 1, 2, 3],
];
// Bounce is in C major: a bright pentatonic (G A C D E G) instead of the A minor of mode 1.
const BOUNCE_SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99];
const BOUNCE_SEQ = [2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 2, 0]; // scale index for each successive landing
// 8-bar progression: Cmaj7 | Em7 | Am7 | Fmaj7 | Dm7 | G7 | Cmaj7 | G7
const CHORDS_B = [
  { r: 65.41, n: [261.63, 329.63, 392, 493.88] },
  { r: 82.41, n: [164.81, 196, 246.94, 293.66] },
  { r: 55, n: [220, 261.63, 329.63, 392] },
  { r: 43.65, n: [174.61, 220, 261.63, 329.63] },
  { r: 73.42, n: [146.83, 174.61, 220, 261.63] },
  { r: 49, n: [196, 246.94, 293.66, 349.23] },
  { r: 65.41, n: [261.63, 329.63, 392, 493.88] },
  { r: 49, n: [196, 246.94, 293.66, 349.23] },
];
const BOUNCE_BASS = { 0: 1, 3: 2, 4: 1, 6: 1.5, 7: 2 }; // half-beat step -> multiple of the chord root
const BALL_X = 90, PX_PER_BEAT = 64;

