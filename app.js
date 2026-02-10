const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const feedbackEl = document.getElementById("feedback");
const streakEl = document.getElementById("streak");
const bestEl = document.getElementById("best");
const emojiEl = document.getElementById("emoji");
const subtitleEl = document.getElementById("subtitle");
const startMenuEl = document.getElementById("startMenu");
const startMessageEl = document.getElementById("startMessage");
const modeActionsEl = document.getElementById("modeActions");
const durationActionsEl = document.getElementById("durationActions");
const durationButtons = document.querySelectorAll(".duration-btn");
const durationBackBtn = document.getElementById("durationBackBtn");
const modeButtons = document.querySelectorAll(".mode-btn");
const gameAreaEl = document.getElementById("gameArea");
const cardEl = document.querySelector(".card");
const newCardBtn = document.getElementById("newCard");
const quitToMenuBtn = document.getElementById("quitToMenu");
const timerStatEl = document.getElementById("timerStat");
const timerEl = document.getElementById("timer");
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
const CARD_TRANSITION_MS = 280;
const CONFETTI_COLORS = ["#ff8a5b", "#ffcc70", "#4dd4ac", "#57a6ff", "#ff6ea9", "#8b7bff"];

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
  mode: null,
  timeRemaining: 0,
  timeTrialDuration: 60,
  timeTrialCompletedCards: 0,
  timeTrialBestStreak: 0,
  locked: false,
};

let audioCtx;
let musicStarted = false;
let backgroundMusicEl;
let cardTransitionInProgress = false;
let confettiLayerEl;
let confettiParticles = [];
let confettiRafId = 0;
let confettiLastTs = 0;
let resumeMusicOnForeground = false;
let timeTrialTimerId = 0;
let startMenuUnlockTimeoutId = 0;

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
    backgroundMusicEl.volume = 0.175;
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

function handleVisibilityChange() {
  if (document.hidden) {
    resumeMusicOnForeground = Boolean(backgroundMusicEl && !backgroundMusicEl.paused);
    pauseBackgroundMusic();
    return;
  }

  if (resumeMusicOnForeground && state.soundEnabled) {
    startBackgroundMusic();
  }
  resumeMusicOnForeground = false;
}

function makeQuestion() {
  if (!state.mode) return;
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

function updateTimerDisplay() {
  timerEl.textContent = `${state.timeRemaining}s`;
}

function stopTimeTrialTimer() {
  if (!timeTrialTimerId) return;
  window.clearInterval(timeTrialTimerId);
  timeTrialTimerId = 0;
}

function disableAnswerButtons() {
  answersEl.querySelectorAll("button").forEach((btn) => {
    btn.disabled = true;
  });
}

function setStartMenuControlsEnabled(enabled) {
  modeButtons.forEach((button) => {
    button.disabled = !enabled;
  });
  durationButtons.forEach((button) => {
    button.disabled = !enabled;
  });
  durationBackBtn.disabled = !enabled;
}

function showStartMenu(messageText, controlsDelayMs = 0) {
  if (startMenuUnlockTimeoutId) {
    window.clearTimeout(startMenuUnlockTimeoutId);
    startMenuUnlockTimeoutId = 0;
  }
  stopTimeTrialTimer();
  state.mode = null;
  state.locked = true;
  quitToMenuBtn.hidden = true;
  modeActionsEl.hidden = false;
  durationActionsEl.hidden = true;
  gameAreaEl.hidden = true;
  startMenuEl.hidden = false;
  if (messageText) {
    startMessageEl.textContent = messageText;
  } else {
    startMessageEl.textContent = "How do you want to play?";
  }
  subtitleEl.textContent = "Choose a mode to start!";

  if (controlsDelayMs > 0) {
    setStartMenuControlsEnabled(false);
    startMenuUnlockTimeoutId = window.setTimeout(() => {
      setStartMenuControlsEnabled(true);
      startMenuUnlockTimeoutId = 0;
    }, controlsDelayMs);
    return;
  }

  setStartMenuControlsEnabled(true);
}

function startTimeTrialTimer() {
  stopTimeTrialTimer();
  state.timeRemaining = state.timeTrialDuration;
  state.timeTrialCompletedCards = 0;
  state.timeTrialBestStreak = 0;
  updateTimerDisplay();
  timerStatEl.hidden = false;

  timeTrialTimerId = window.setInterval(() => {
    state.timeRemaining -= 1;
    updateTimerDisplay();
    if (state.timeRemaining > 0) return;

    stopTimeTrialTimer();
    state.locked = true;
    disableAnswerButtons();
    feedbackEl.textContent = "Time's up!";
    feedbackEl.className = "feedback";
    showStartMenu(
      `Time Trial complete. Cards: ${state.timeTrialCompletedCards} | Best streak: ${state.timeTrialBestStreak}`,
      1200,
    );
  }, 1000);
}

function startMode(mode) {
  state.mode = mode;
  state.streak = 0;
  state.locked = false;
  updateStats();
  closeSettingsMenu();
  quitToMenuBtn.hidden = false;
  startMenuEl.hidden = true;
  gameAreaEl.hidden = false;

  if (mode === "time-trial") {
    subtitleEl.textContent = `Time Trial: answer as many as you can in ${state.timeTrialDuration} seconds!`;
    startTimeTrialTimer();
  } else {
    subtitleEl.textContent = "Infinite Mode: keep going as long as you like!";
    stopTimeTrialTimer();
    timerStatEl.hidden = true;
  }

  feedbackEl.textContent = "Tap your answer";
  feedbackEl.className = "feedback";
  startBackgroundMusic();
  showNextCard();
}

function showTimeTrialDurationChooser() {
  startMessageEl.textContent = "Choose your time limit";
  modeActionsEl.hidden = true;
  durationActionsEl.hidden = false;
}

function showModeChooser() {
  startMessageEl.textContent = "How do you want to play?";
  modeActionsEl.hidden = false;
  durationActionsEl.hidden = true;
}

function showNextCard() {
  if (!cardEl) {
    makeQuestion();
    return;
  }
  if (cardTransitionInProgress) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    makeQuestion();
    return;
  }

  cardTransitionInProgress = true;
  cardEl.classList.remove("card-enter");
  cardEl.classList.add("card-exit");

  window.setTimeout(() => {
    makeQuestion();
    cardEl.classList.remove("card-exit");
    cardEl.classList.add("card-enter");

    window.setTimeout(() => {
      cardEl.classList.remove("card-enter");
      cardTransitionInProgress = false;
    }, CARD_TRANSITION_MS);
  }, CARD_TRANSITION_MS);
}

function getConfettiLayer() {
  if (!confettiLayerEl) {
    confettiLayerEl = document.createElement("div");
    confettiLayerEl.className = "confetti-layer";
    document.body.appendChild(confettiLayerEl);
  }
  return confettiLayerEl;
}

function tickConfetti(timestamp) {
  if (!confettiLastTs) {
    confettiLastTs = timestamp;
  }
  const dt = Math.min((timestamp - confettiLastTs) / 1000, 0.034);
  confettiLastTs = timestamp;

  for (let i = confettiParticles.length - 1; i >= 0; i -= 1) {
    const particle = confettiParticles[i];
    particle.life += dt;
    const progress = particle.life / particle.ttl;

    particle.vy += particle.gravity * dt;
    particle.vx += particle.wind * dt;
    particle.vx *= particle.drag;
    particle.vy *= particle.drag;

    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rot += particle.vrot * dt;

    const fadeIn = Math.min(progress / 0.1, 1);
    const fadeOut = progress > 0.75 ? Math.max(0, 1 - (progress - 0.75) / 0.25) : 1;
    particle.el.style.opacity = String(Math.min(fadeIn, fadeOut));
    particle.el.style.transform = `translate(${particle.x.toFixed(2)}px, ${particle.y.toFixed(2)}px) rotate(${particle.rot.toFixed(1)}deg)`;

    if (progress >= 1 || particle.y > window.innerHeight + 64) {
      particle.el.remove();
      confettiParticles.splice(i, 1);
    }
  }

  if (confettiParticles.length === 0) {
    confettiRafId = 0;
    confettiLastTs = 0;
    return;
  }

  confettiRafId = window.requestAnimationFrame(tickConfetti);
}

function startConfettiLoop() {
  if (confettiRafId) return;
  confettiRafId = window.requestAnimationFrame(tickConfetti);
}

function launchConfetti(originEl) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = getConfettiLayer();
  const originRect =
    originEl?.getBoundingClientRect() ||
    (cardEl ? cardEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: 160, width: 0 });
  const startX = originRect.left + originRect.width / 2;
  const startY = originRect.top + originRect.height * 0.35;
  const pieces = 44;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
    const speed = randInt(280, 620);
    const vx = Math.cos(angle) * speed + randInt(-45, 45);
    const vy = Math.sin(angle) * speed;
    const width = randInt(5, 11);
    const height = randInt(7, 16);
    const roundness = randInt(2, 9);
    const ttl = 1.15 + Math.random() * 0.85;
    const gravity = randInt(820, 1120);
    const wind = randInt(-18, 18);
    const drag = 0.986 + Math.random() * 0.008;
    const rot = randInt(0, 360);
    const vrot = randInt(-980, 980);

    piece.className = "confetti-piece";
    piece.style.left = "0";
    piece.style.top = "0";
    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
    piece.style.borderRadius = `${roundness}px`;
    piece.style.backgroundColor = pick(CONFETTI_COLORS);
    piece.style.opacity = "0";
    piece.style.transform = `translate(${startX.toFixed(2)}px, ${startY.toFixed(2)}px) rotate(${rot}deg)`;
    layer.appendChild(piece);

    confettiParticles.push({
      el: piece,
      x: startX,
      y: startY,
      vx,
      vy,
      gravity,
      wind,
      drag,
      rot,
      vrot,
      life: Math.random() * 0.05,
      ttl,
    });
  }

  startConfettiLoop();
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
  if (state.locked || !state.mode) return;

  if (value === state.answer) {
    state.locked = true;
    state.streak += 1;
    if (state.mode === "time-trial") {
      state.timeTrialCompletedCards += 1;
      state.timeTrialBestStreak = Math.max(state.timeTrialBestStreak, state.streak);
    }
    state.best = Math.max(state.best, state.streak);
    localStorage.setItem("bestStreak", String(state.best));
    updateStats();
    button.classList.add("good");
    const feedbackText = pick(praise);
    feedbackEl.textContent = feedbackText;
    feedbackEl.className = "feedback good";
    playToneSequence("good");
    launchConfetti(button);
    speak(pick(correctVoiceLines));
    setTimeout(showNextCard, 700);
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
  if (!state.mode) return;
  startBackgroundMusic();
  showNextCard();
});

quitToMenuBtn.addEventListener("click", () => {
  if (!state.mode) return;
  showStartMenu(`You left the game. Last streak: ${state.streak}`);
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
  if (state.mode) {
    showNextCard();
  }
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

document.addEventListener("visibilitychange", handleVisibilityChange);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    if (mode !== "time-trial" && mode !== "infinite") return;
    if (mode === "time-trial") {
      showTimeTrialDurationChooser();
      return;
    }
    startMode(mode);
  });
});

durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const seconds = Number(button.dataset.seconds);
    if (![15, 30, 60].includes(seconds)) return;
    state.timeTrialDuration = seconds;
    startMode("time-trial");
  });
});

durationBackBtn.addEventListener("click", () => {
  showModeChooser();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

showStartMenu();
