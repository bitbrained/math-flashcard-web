const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const feedbackEl = document.getElementById("feedback");
const streakEl = document.getElementById("streak");
const bestEl = document.getElementById("best");
const emojiEl = document.getElementById("emoji");
const newCardBtn = document.getElementById("newCard");
const settingsWrapEl = document.getElementById("settingsWrap");
const settingsBtnEl = document.getElementById("settingsBtn");
const settingsMenuEl = document.getElementById("settingsMenu");
const rangeSelectEl = document.getElementById("rangeSelect");
const soundToggleEl = document.getElementById("soundToggle");
const voiceToggleEl = document.getElementById("voiceToggle");
const resetBestBtnEl = document.getElementById("resetBestBtn");

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

const BACKGROUND_MUSIC_SRC = "./audio/counting-cloud-breeze.mp3";

const state = {
  a: 1,
  b: 1,
  op: "+",
  answer: 2,
  streak: 0,
  best: Number(localStorage.getItem("bestStreak") || 0),
  maxNumber: Number(localStorage.getItem("maxNumber") || 10),
  soundEnabled: localStorage.getItem("soundEnabled") !== "false",
  voiceEnabled: localStorage.getItem("voiceEnabled") !== "false",
  locked: false,
};

let audioCtx;
let musicStarted = false;
let backgroundMusicEl;

bestEl.textContent = String(state.best);
if (![10, 20, 50].includes(state.maxNumber)) {
  state.maxNumber = 10;
}
rangeSelectEl.value = String(state.maxNumber);
soundToggleEl.checked = state.soundEnabled;
voiceToggleEl.checked = state.voiceEnabled;

function closeSettingsMenu() {
  settingsMenuEl.hidden = true;
  settingsBtnEl.setAttribute("aria-expanded", "false");
}

function openSettingsMenu() {
  settingsMenuEl.hidden = false;
  settingsBtnEl.setAttribute("aria-expanded", "true");
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function getBackgroundMusic() {
  if (!backgroundMusicEl) {
    backgroundMusicEl = new Audio(BACKGROUND_MUSIC_SRC);
    backgroundMusicEl.loop = true;
    backgroundMusicEl.volume = 0.35;
    backgroundMusicEl.preload = "auto";
  }
  return backgroundMusicEl;
}

function startBackgroundMusic() {
  if (!state.soundEnabled) return;
  const music = getBackgroundMusic();
  if (!music.paused) return;
  music
    .play()
    .then(() => {
      musicStarted = true;
    })
    .catch(() => {});
}

function pauseBackgroundMusic() {
  if (!backgroundMusicEl) return;
  backgroundMusicEl.pause();
}

function makeQuestion() {
  const useAdd = Math.random() > 0.45;
  let a = randInt(0, state.maxNumber);
  let b = randInt(0, state.maxNumber);
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
  if (!state.voiceEnabled) return;
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
  if (!state.soundEnabled) return;
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

settingsBtnEl.addEventListener("click", () => {
  if (settingsMenuEl.hidden) {
    openSettingsMenu();
  } else {
    closeSettingsMenu();
  }
});

rangeSelectEl.addEventListener("change", () => {
  const nextMax = Number(rangeSelectEl.value);
  if (![10, 20, 50].includes(nextMax)) return;
  state.maxNumber = nextMax;
  localStorage.setItem("maxNumber", String(state.maxNumber));
  makeQuestion();
});

soundToggleEl.addEventListener("change", () => {
  state.soundEnabled = soundToggleEl.checked;
  localStorage.setItem("soundEnabled", String(state.soundEnabled));
  if (!state.soundEnabled) {
    pauseBackgroundMusic();
  } else if (musicStarted) {
    startBackgroundMusic();
  }
});

voiceToggleEl.addEventListener("change", () => {
  state.voiceEnabled = voiceToggleEl.checked;
  localStorage.setItem("voiceEnabled", String(state.voiceEnabled));
  if (!state.voiceEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});

resetBestBtnEl.addEventListener("click", () => {
  state.best = 0;
  localStorage.setItem("bestStreak", "0");
  updateStats();
  feedbackEl.textContent = "Best streak reset";
  feedbackEl.className = "feedback";
  closeSettingsMenu();
});

document.addEventListener("click", (event) => {
  if (!settingsWrapEl.contains(event.target)) {
    closeSettingsMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettingsMenu();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

makeQuestion();
