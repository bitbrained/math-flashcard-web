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

const state = {
  a: 1,
  b: 1,
  op: "+",
  answer: 2,
  streak: 0,
  best: Number(localStorage.getItem("bestStreak") || 0),
  locked: false,
};

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
    feedbackEl.textContent = pick(praise);
    feedbackEl.className = "feedback good";
    speak("Great job");
    setTimeout(makeQuestion, 700);
  } else {
    button.classList.add("bad");
    state.streak = 0;
    updateStats();
    feedbackEl.textContent = pick(tryAgain);
    feedbackEl.className = "feedback bad";
    speak("Try again");
  }
}

newCardBtn.addEventListener("click", makeQuestion);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

makeQuestion();
