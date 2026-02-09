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

bestEl.textContent = String(state.best);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
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

newCardBtn.addEventListener("click", makeQuestion);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

makeQuestion();
