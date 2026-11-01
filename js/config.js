'use strict';
// Constants and level data: layout, colours, tempo, scoring, ranks, charts and chords for all three modes.

const W = 320, H = 180, HORIZON = 100;
const C = {
  cyan: '#00f0ff', mag: '#ff2bd6', yel: '#fff200', pur: '#7a2cff',
  grn: '#39ff14', red: '#ff3355', white: '#ffffff', dark: '#1a0f33',
};

// ---------- level ----------
const MODE_BPM = [120, 128, 140, 160];
let SPB = 60 / MODE_BPM[0]; // seconds per beat; follows the current mode's tempo (see setTempo)
const EXTRA_BPM = [150, 160, 175, 190]; // the EXTRA challenge: the same games, faster
const setTempo = m => { SPB = 60 / (extra ? EXTRA_BPM : MODE_BPM)[m]; };
const noteHz = n => { // 'F#5' -> 739.99, 'Bb4' -> 466.16
  const [, letter, acc, oct] = n.match(/^([A-G])([#b]?)(\d)$/);
  return 440 * 2 ** (('C.D.EF.G.A.B'.indexOf(letter) + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12 * (+oct + 1) - 69) / 12);
};
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
// The tune of each round: one note per beat in ROUNDS, played by the bot and then repeated by you. The bot calls over
// Am (even rounds) or C (odd rounds) and you answer over F or G, so every note on a beat fits both chords. The hook
// is the menu theme's opening, E D C D E (round 5), so the game and the menu sound like one song.
const CALL_MELODY = [
  // first verse: a falling line, an answer climbing back, then the hook
  'E5 D5 C5 A4', 'B4 D5 E5 D5', 'A4 C5 E5', 'G5 E5 D5',
  'E5 D5 C5 D5 E5', 'B4 C5 D5 G4', 'A4 C5 D5 E5 A5', 'G5 E5 D5 B4',
  // middle: higher and busier, off the beat, then a run down
  'A5 G5 E5 C5 D5 E5', 'B4 D5 G5 E5', 'C5 E5 G5 E5', 'D5 C5 B4 A4 G4 B4',
  // climax: the hook up high, rising, and a last run that comes home to A
  'E5 C5 D5 E5 A5 G5', 'G5 E5 D5 B4 C5 D5 E5', 'A5 G5 E5 D5 C5 D5', 'G5 E5 D5 E5 D5 B4 G4 A4',
];
const CALL_TUNE = CALL_MELODY.join(' ').split(' ').map(noteHz); // every call note in order, in Hz
const W_PERF = 0.045, W_GOOD = 0.09, W_BAD = 0.15; // seconds
const BOUNCE_DELAY_MS = 40; // extra built-in delay for bounce: presses count this much later
const POINTS = { perfect: 100, good: 60, bad: 20 };
const WEIGHT = { perfect: 1, good: 0.7, bad: 0.35, miss: 0 };
const MODES = ['CALL & RESPONSE', 'BOUNCE', 'TWIN TAP', 'PING PONG'];
const PLAYABLE = 4; // modes at or beyond this index are still "soon"
const MENU_ITEMS = ['PLAY', 'SETTINGS']; // the main menu; PLAY opens the game select screen
const EXTRA_ITEM = 2; // the glowing EXTRA row, added to the main menu once every game has a C or better
const EXTRA_FILTER = 'hue-rotate(-75deg) saturate(1.15)'; // EXTRA's colour scheme: the neon purples and pinks turn to teal and green
const MENU_HINT = ['CHOOSE A GAME AND PLAY.', 'DELAY, VOLUME AND CALIBRATION.', 'ALL THE GAMES AGAIN, BUT FASTER.'];
// Progression: each mode unlocks once the one before it has been cleared with at least this rank.
const RANKS = ['F', 'D', 'C', 'B', 'A', 'S', 'S+'];
const UNLOCK_RANK = RANKS.indexOf('C');
const RANK_COL = { 'S+': '#fff200', S: '#fff200', A: '#39ff14', B: '#00f0ff', C: '#ff2bd6', D: '#b79cff', F: '#ff3355' };
const MODE_HINT = [
  'LISTEN TO THE BOT. THEN REPEAT IT ON THE BEAT.',
  'TAP THE MOMENT THE BALL LANDS ON EACH PAD.',
  'LEFT: < OR A   RIGHT: > OR D   HIT EACH SIDE ON BEAT.',
  'HIT THE BALL BACK AS IT REACHES YOUR PADDLE.',
];

// ---------- twin tap level ----------
// The song is the chart: a melody written for two hands, and every note of it is a pulse to hit.
// One string per bar, 8 space-separated slots of half a beat each: <D4 = the left twin plays D4, >F5 = the right twin
// plays F5, <D4>D5 = both at once (a double), . = rest. The left twin plays in a square voice, the right in a saw.
// Rule: a left and a right note may share a slot (a double) but never sit closer than MIN_SIDE_GAP beats apart, so
// a double can't be mistaken for two near-misses; one hand's runs can be as fast as eighths. The melody is written
// around that: hand changes fall where the phrase breathes.
// Chords per bar, each 8-bar section: Dm7, Bbmaj7, F, C7, Gm7, Bbmaj7, Asus, Dm.
const TWIN_SONG = [
  // intro (140): one hand calls, the other answers, ending on the first double
  '<D4 . . . >F5 . . .', '<D4 . . . >F5 . . .', '<F4 . . . >C5 . . .', '<E4 . . . >G5 . . .',
  '<G4 . <Bb4 . >D5 . . .', '<F4 . <D4 . >F5 . . .', '<E4 . <A4 . >D5 . >E5 .', '<D4>D5 . . . . . . .',
  // verse (140): every bar the left runs up or down three quick notes and the right answers twice
  '<D4 <E4 <F4 . >A5 . >F5 .', '<F4 <G4 <A4 . >F5 . >D5 .', '<A4 <G4 <F4 . >F5 . >C5 .', '<G4 <A4 <Bb4 . >G5 . >E5 .',
  '<Bb4 <A4 <G4 . >F5 . >D5 .', '<F4 <G4 <A4 . >F5 . >D5 .', '<A4 <G4 <E4 . >D5 . >E5 .', '<D4 . . . <F4>A5 . . .',
  // chorus (140), the hook: one hand calls (on 1, 2, the & of 2, the & of 3), the other picks up on the & of 4
  // and answers in the next bar
  '<D4 . <F4 <A4 . <C5 . >E5', '>F5 . >D5 >C5 . >A4 . <G4', '<F4 . <A4 <C5 . <A4 . >A5', '>G5 . >E5 >C5 . >Bb4 . <F4',
  '<G4 . <Bb4 <D5 . <Bb4 . >E5', '>F5 . >D5 >C5 . >A4 . <G4', '<A4 . <G4 <E4 . <D4 . .', '<D4>F5 . . . <A4>D5 . . .',
  // bridge (150): four-note runs, answered across, ending in climbing octave doubles
  '<D4 <F4 <A4 <F4 . >D5 >C5 .', '>D5 >F5 >A5 >F5 . <C5 <Bb4 .', '<F4 <A4 <C5 <A4 . >G5 >F5 .', '>C5 >E5 >G5 >E5 . <Bb4 <G4 .',
  '<G4 <Bb4 <D5 <Bb4 . >E5 >D5 .', '>D5 >F5 >A5 >F5 . <G4 <F4 .', '<E4 <G4 <A4 <G4 . >D5 >E5 .', '<D4>D5 . <F4>F5 . <A4>A5 . . .',
  // final chorus (160): the hook again, and a falling run of octave doubles to finish
  '<D4 . <F4 <A4 . <C5 . >E5', '>F5 . >D5 >C5 . >A4 . <G4', '<F4 . <A4 <C5 . <A4 . >A5', '>G5 . >E5 >C5 . >Bb4 . <F4',
  '<G4 . <Bb4 <D5 . <Bb4 . >E5', '>F5 . >D5 >C5 . >A4 . <G4', '<A4 . <G4 <E4 . <D4 . .', '<A4>A5 . <F4>F5 . <D4>D5 . . .',
];
// The song speeds up: [[from beat, bpm], ...]. Bridge at 150, final chorus at 160.
const TWIN_TEMPO = [[0, 140], [96, 150], [128, 160]];
const MIN_SIDE_GAP = 1; // beats
const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
const TAP_KEYS = ['Space', 'Enter', 'KeyC', 'KeyZ', 'KeyX', 'KeyJ', 'KeyK', 'KeyF', ...LEFT_KEYS, ...RIGHT_KEYS]; // any of these hits in the other modes
// Every note of the song in order, in Hz; each pulse points into this by idx.
const TWIN_TUNE = TWIN_SONG.flatMap(bar => bar.split(' ')).flatMap(tok => [...tok.matchAll(/[<>]([A-G][#b]?\d)/g)].map(m => noteHz(m[1])));
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

// ---------- ping pong level ----------
// One string per bar, one character per half-beat: c = the bot hits, p = you hit, P = you smash, . = the ball in flight.
// Shots alternate, starting with the bot's serve, at most 2 beats apart; a smash is always returned half a beat later.
// The ball takes at least PONG_MIN_INCOMING beats to reach you; your own returns may be as quick as half a beat.
// A smash lands off the beat, set up by a high lob from the bot 1.5 or 2 beats before it; the very last shot of the
// song may be a smash that nobody returns. The song runs in 8-bar sections (PONG_SECTIONS), one chord loop each.
const PONG_BARS = [
  // intro: slow lobs, then steady drives; the first smash closes it
  'c...p...', 'c...p...', 'c...p...', 'c.p.c.p.', 'c.p.c.p.', 'c.p.c.p.', 'c.p.c.p.', 'c.p.c..P',
  // verse: drives, and the first off-beat hits
  'c.p.c.p.', 'c.pc.p.c', '.p.c.p.c', '.p.c.p..', 'c.p.c.p.', 'c.pc.p.c', '.p.c.p.c', '.p.c...P',
  // chorus: quick syncopated exchanges, you on the beat, then off it
  'c.pc.pc.', 'p.c.pc.p', 'c.pc.pc.', 'p.c.pc.p', 'c.pc.pc.', 'p.c.pc.p', 'c.pc.pc.', 'p..c...P',
  // breakdown: long lobs while the drums drop out, then the build back up
  'c...p...', 'c..p..c.', '.p...c..', '.p..c...', 'p...c.p.', 'c.p.c.p.', 'c.pc.p.c', '.p.c...P',
  // final chorus: the chorus again, note for note, with a winner to finish
  'c.pc.pc.', 'p.c.pc.p', 'c.pc.pc.', 'p.c.pc.p', 'c.pc.pc.', 'p.c.pc.p', 'c.pc.pc.', 'p..c...P',
];
const PONG_SECTIONS = ['intro', 'verse', 'chorus', 'break', 'chorus']; // the arrangement, one per 8 bars
const PONG_MIN_INCOMING = 1;
// The tune is a duet in hocket: one melody runs across every shot of the rally, and the bot (square-wave voice)
// and you each play the notes that fall on your own shots, so it only sounds whole when you keep the rally going.
// One string per bar for each side, one note per c (PONG_BOT_MELODY) or p/P (PONG_MELODY) in that bar's chart,
// written against the chord underneath (each section: Em7, Cmaj7, G, D, Em7, Cmaj7, Am7, B7); - would be a silent shot.
//   The hook, over two bars of the chorus:  E5 D5 B4 D5 E5 | G5 E5 C5 D5 B4  (bot, you, bot, you, bot | you, bot, ...)
//   Every section ends on the same call: you D#5, the bot lobs B4, you smash F#5. The final winner rings a high B5.
const PONG_MELODY = [
  // intro: answers to the bot's calls, then the first taste of the hook (bar 5)
  'B4', 'C5', 'B4', 'A4 A4', 'D5 D5', 'G5 C5', 'C5 C5', 'D#5 F#5',
  // verse: one 4-bar phrase, played twice
  'G4 G4', 'G4 B4', 'D5 G4', 'F#4 D5', 'G4 G4', 'G4 B4', 'C5 C5', 'D#5 F#5',
  // chorus: the hook, then up a step over G and D, then the hook again
  'D5 D5', 'G5 C5 B4', 'B4 B4', 'F#5 A4 D5', 'D5 D5', 'G5 C5 B4', 'C5 C5', 'D#5 F#5',
  // breakdown: the hook slowed right down, one note each, then the climb
  'D5', 'D5', 'G5', 'F#5', 'E5 G4', 'C5 G5', 'C5 A5', 'D#5 F#5',
  // final chorus: the chorus again, and the winner
  'D5 D5', 'G5 C5 B4', 'B4 B4', 'F#5 A4 D5', 'D5 D5', 'G5 C5 B4', 'C5 C5', 'D#5 B5',
];
const PONG_BOT_MELODY = [
  // intro: calls for you to answer, climbing into the hook
  'E5', 'E5', 'D5', 'D5 F#4', 'E5 B4', 'E5 E5', 'A4 E5', 'A4 B4',
  // verse
  'E4 B4', 'E4 C5 G4', 'B4 A4', 'A4', 'E4 B4', 'E4 C5 G4', 'A4 E5', 'B4',
  // chorus
  'E5 B4 E5', 'E5 D5', 'D5 G4 D5', 'D5 B4', 'E5 B4 E5', 'E5 D5', 'E5 A4 E5', 'B4',
  // breakdown
  'E5', 'B4 E5', 'D5', 'D5', 'B4', 'G4 E5', 'A4 E5 E5', 'B4',
  // final chorus
  'E5 B4 E5', 'E5 D5', 'D5 G4 D5', 'D5 B4', 'E5 B4 E5', 'E5 D5', 'E5 A4 E5', 'B4',
];
const PONG_TUNE = PONG_MELODY.join(' ').split(' ').filter(Boolean).map(noteHz); // your hits in order, in Hz
const PONG_BOT_TUNE = PONG_BOT_MELODY.join(' ').split(' ').filter(Boolean).map(n => (n === '-' ? null : noteHz(n))); // null: no note
// Em7 | Cmaj7 | G | D | Em7 | Cmaj7 | Am7 | B7
const CHORDS_P = [
  { r: 82.41, n: [164.81, 196, 246.94, 293.66] },
  { r: 65.41, n: [261.63, 329.63, 392, 493.88] },
  { r: 98, n: [196, 246.94, 293.66, 392] },
  { r: 73.42, n: [220, 293.66, 369.99, 440] },
  { r: 82.41, n: [164.81, 196, 246.94, 293.66] },
  { r: 65.41, n: [261.63, 329.63, 392, 493.88] },
  { r: 55, n: [220, 261.63, 329.63, 392] },
  { r: 61.74, n: [246.94, 311.13, 369.99, 440] },
];
const PONG_BASS = { 0: 1, 2: 2, 3: 1, 4: 1, 6: 2, 7: 1.5 }; // half-beat step -> multiple of the chord root

const MODE_SCALE = [CALL_TUNE, BOUNCE_SCALE, TWIN_TUNE, PONG_TUNE]; // the notes your hits play

