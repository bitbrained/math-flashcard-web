const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const feedbackEl = document.getElementById("feedback");
const streakEl = document.getElementById("streak");
const bestEl = document.getElementById("best");
const emojiEl = document.getElementById("emoji");
const newCardBtn = document.getElementById("newCard");

const friendlyEmojis = ["🧸", "🚂", "🐣", "🦄", "🌈", "🍎", "🦋", "🎈"];
const praise = ["Great job!", "Awesome!", "You did it!", "Super!", "Nice work!"];
const tryAgain = ["Try again!", "Almost!", "You can do it!", "Give it another tap!"];
const correctVoiceLines = ["Great job!", "Awesome work!", "You got it!", "Super star!"];
const incorrectVoiceLines = ["Try again!", "Almost there!", "Keep trying!", "One more time!"];

const correctTonePatterns = [
  [523.25, 659.25, 783.99],
  [587.33, 739.99, 880.0],
  [659.25, 783.99, 987.77],
];

const incorrectTonePatterns = [
  [329.63, 277.18],
  [392.0, 311.13],
  [349.23, 261.63],
];

const MUSIC_BPM = 90;
const BEAT_SECONDS = 60 / MUSIC_BPM;
const TRACK_ONE_LENGTH_BEATS = 32;
const TRACK_TWO_LENGTH_BEATS = 16;

const trackOneEvents = [
  { beat: 0, note: "C4", duration: 1 },
  { beat: 1, note: "E4", duration: 1 },
  { beat: 2, note: "G4", duration: 1 },
  { beat: 3, note: "E4", duration: 1 },
  { beat: 4, note: "A3", duration: 1 },
  { beat: 5, note: "C4", duration: 1 },
  { beat: 6, note: "E4", duration: 1 },
  { beat: 7, note: "C4", duration: 1 },
  { beat: 8, note: "F3", duration: 1 },
  { beat: 9, note: "A3", duration: 1 },
  { beat: 10, note: "C4", duration: 1 },
  { beat: 11, note: "A3", duration: 1 },
  { beat: 12, note: "G3", duration: 1 },
  { beat: 13, note: "B3", duration: 1 },
  { beat: 14, note: "D4", duration: 1 },
  { beat: 15, note: "B3", duration: 1 },
  { beat: 16, note: "C4", duration: 1 },
  { beat: 17, note: "E4", duration: 1 },
  { beat: 18, note: "G4", duration: 1 },
  { beat: 19, note: "E4", duration: 1 },
  { beat: 20, note: "A3", duration: 1 },
  { beat: 21, note: "C4", duration: 1 },
  { beat: 22, note: "E4", duration: 1 },
  { beat: 23, note: "C4", duration: 1 },
  { beat: 24, note: "F3", duration: 1 },
  { beat: 25, note: "A3", duration: 1 },
  { beat: 26, note: "G3", duration: 1 },
  { beat: 27, note: "B3", duration: 1 },
  { beat: 28, note: "C4", duration: 4 },
];

const trackTwoEvents = [
  { beat: 0, note: "C3", duration: 4 },
  { beat: 4, note: "A2", duration: 4 },
  { beat: 8, note: "F2", duration: 4 },
  { beat: 12, note: "G2", duration: 4 },
];

const state = {
  a: 1,
  b: 1,
  op: "+",
  answer: 2,
  streak: 0,
  best: Number(localStorage.getItem("bestStreak") || 0),
  locked: false,
};

let audioCtx;
let musicIntervalId;
let musicStarted = false;
let nextBeatAt = 0;
let musicBeat = 0;

bestEl.textContent = String(state.best);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function noteToFrequency(note) {
  const pitchMap = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };
  const match = note.match(/^([A-G]#?)(-?\d)$/);
  if (!match) return 440;
  const pitchClass = pitchMap[match[1]];
  const octave = Number(match[2]);
  const midi = pitchClass + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playPianoTone(note, start, beats) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const duration = beats * BEAT_SECONDS;
  const freq = noteToFrequency(note);

  const oscMain = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const gain = ctx.createGain();

  oscMain.type = "triangle";
  oscHarmonic.type = "sine";
  oscMain.frequency.setValueAtTime(freq, start);
  oscHarmonic.frequency.setValueAtTime(freq * 2, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.018, start + Math.min(0.18, duration * 0.4));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscMain.connect(gain);
  oscHarmonic.connect(gain);
  gain.connect(ctx.destination);

  oscMain.start(start);
  oscHarmonic.start(start);
  oscMain.stop(start + duration + 0.02);
  oscHarmonic.stop(start + duration + 0.02);
}

function playPadTone(note, start, beats) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const duration = beats * BEAT_SECONDS;
  const freq = noteToFrequency(note);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.02, start + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.012, start + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function scheduleMusic() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const scheduleAhead = 0.35;

  while (nextBeatAt < ctx.currentTime + scheduleAhead) {
    const trackOneBeat = musicBeat % TRACK_ONE_LENGTH_BEATS;
    const trackTwoBeat = musicBeat % TRACK_TWO_LENGTH_BEATS;

    trackOneEvents.forEach((event) => {
      if (event.beat === trackOneBeat) {
        playPianoTone(event.note, nextBeatAt, event.duration);
      }
    });

    trackTwoEvents.forEach((event) => {
      if (event.beat === trackTwoBeat) {
        playPadTone(event.note, nextBeatAt, event.duration);
      }
    });

    nextBeatAt += BEAT_SECONDS;
    musicBeat += 1;
  }
}

function startBackgroundMusic() {
  if (musicStarted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  musicStarted = true;
  nextBeatAt = ctx.currentTime + 0.05;
  musicBeat = 0;
  scheduleMusic();
  musicIntervalId = window.setInterval(scheduleMusic, 100);
}

function makeQuestion() {
  const useAdd = Math.random() > 0.45;
  let a = randInt(0, 10);
  let b = randInt(0, 10);
  let op = "+";
  let answer = a + b;

  if (!useAdd) {
    if (a < b) {
      const t = a;
      a = b;
      b = t;
    }
    op = "-";
    answer = a - b;
  }

  state.a = a;
  state.b = b;
  state.op = op;
  state.answer = answer;
  state.locked = false;

  questionEl.textContent = `${a} ${op} ${b} = ?`;
  emojiEl.textContent = pick(friendlyEmojis);
  feedbackEl.textContent = "Tap your answer";
  feedbackEl.className = "feedback";

  renderChoices(answer);
}

function renderChoices(correct) {
  const options = new Set([correct]);
  while (options.size < 4) {
    const delta = randInt(-3, 3);
    const candidate = Math.max(0, correct + delta + randInt(-2, 2));
    options.add(candidate);
  }

  const shuffled = [...options].sort(() => Math.random() - 0.5);
  answersEl.innerHTML = "";

  shuffled.forEach((value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-btn";
    btn.textContent = String(value);
    btn.setAttribute("aria-label", `Answer ${value}`);
    btn.addEventListener("click", () => onAnswer(btn, value));
    answersEl.appendChild(btn);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9;
  utter.pitch = 1.2;
  window.speechSynthesis.speak(utter);
}

function getAudioContext() {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playToneSequence(type) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const pattern = pick(type === "good" ? correctTonePatterns : incorrectTonePatterns);
  const now = ctx.currentTime;
  const noteDuration = type === "good" ? 0.14 : 0.18;
  const waveType = type === "good" ? "triangle" : "sine";

  pattern.forEach((freq, i) => {
    const start = now + i * (noteDuration + 0.02);
    const end = start + noteDuration;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.17, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  });
}

function updateStats() {
  streakEl.textContent = String(state.streak);
  bestEl.textContent = String(state.best);
}

function onAnswer(button, value) {
  startBackgroundMusic();
  if (state.locked) return;

  if (value === state.answer) {
    state.locked = true;
    state.streak += 1;
    state.best = Math.max(state.best, state.streak);
    localStorage.setItem("bestStreak", String(state.best));
    updateStats();
    button.classList.add("good");
    const feedbackText = pick(praise);
    feedbackEl.textContent = feedbackText;
    feedbackEl.className = "feedback good";
    playToneSequence("good");
    speak(pick(correctVoiceLines));
    setTimeout(makeQuestion, 700);
  } else {
    button.classList.add("bad");
    state.streak = 0;
    updateStats();
    const feedbackText = pick(tryAgain);
    feedbackEl.textContent = feedbackText;
    feedbackEl.className = "feedback bad";
    playToneSequence("bad");
    speak(pick(incorrectVoiceLines));
  }
}

newCardBtn.addEventListener("click", () => {
  startBackgroundMusic();
  makeQuestion();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

makeQuestion();
