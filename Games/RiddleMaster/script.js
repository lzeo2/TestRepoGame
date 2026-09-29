"use strict";

// Game state
const TOTAL_RIDDLES = 10;
const MAX_MISSES = 3;
const POINTS_PER_RIDDLE = 10;

let score = 0;
let misses = 0;
let round = 0;
let hintUsed = false;
let solvedThisHint = false;
let deck = [];
let playing = false;

// Static deck: each riddle with a hint and forgiving accepted answers.
const RIDDLES = [
  { q: "What has keys but can't open locks?",
    a: ["a piano", "piano"], h: "It makes music." },
  { q: "What gets wetter the more it dries?",
    a: ["a towel", "towel"], h: "You use it after a shower." },
  { q: "What has to be broken before you can use it?",
    a: ["an egg", "egg"], h: "Breakfast food." },
  { q: "I'm tall when I'm young and short when I'm old. What am I?",
    a: ["a candle", "candle"], h: "I give light but melt away." },
  { q: "What has hands but cannot clap?",
    a: ["a clock", "clock"], h: "It hangs on a wall." },
  { q: "What has a head and a tail but no body?",
    a: ["a coin", "coin"], h: "You flip it." },
  { q: "What goes up but never comes down?",
    a: ["your age", "age"], h: "It only increases every birthday." },
  { q: "What has one eye but cannot see?",
    a: ["a needle", "needle"], h: "Thread passes through it." },
  { q: "What can travel around the world while staying in a corner?",
    a: ["a stamp", "stamp"], h: "It sits on an envelope." },
  { q: "What has many teeth but cannot bite?",
    a: ["a comb", "comb"], h: "You run it through your hair." }
];

const $ = (id) => document.getElementById(id);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// A guess matches if it equals a canonical answer or appears inside it
// (so "the sun", "a candle", "the piano" all count).
function isCorrect(guess, accepted) {
  const g = normalize(guess);
  if (!g) return false;
  return accepted.some((ans) => {
    const c = normalize(ans).replace(/^(a|an|the) /, "");
    const p = normalize(ans);
    return g === p || g === c || p.endsWith(" " + g);
  });
}

function updateHud() {
  $("score").textContent = String(score);
  $("round").textContent = String(round + 1);
  $("hearts").textContent = String(MAX_MISSES - misses);
}

function showRiddle() {
  const r = deck[round];
  hintUsed = false;
  solvedThisHint = false;
  $("riddle").textContent = r.q;
  $("msg").textContent = "";
  $("msg").className = "";
  $("answer").className = "";
  $("answer").value = "";
  $("answer").focus();
  updateHud();
}

function nextRound() {
  round++;
  if (round >= TOTAL_RIDDLES) {
    end(true);
  } else {
    showRiddle();
  }
}

function end(won) {
  playing = false;
  $("answer").disabled = true;
  $("submitBtn").disabled = true;
  $("hintBtn").disabled = true;
  $("endTitle").textContent = won ? "You win!" : "Game over";
  $("endScore").textContent = String(score);
  $("endText").textContent = won
    ? "You solved all " + TOTAL_RIDDLES + " riddles!"
    : "You solved " + round + " of " + TOTAL_RIDDLES + " riddles.";
  $("endOverlay").classList.remove("hidden");
}

function submit() {
  if (!playing) return;
  const r = deck[round];
  const guess = $("answer").value;
  if (isCorrect(guess, r.a)) {
    const bonus = hintUsed && !solvedThisHint ? 0 : 2;
    score += POINTS_PER_RIDDLE + (MAX_MISSES - misses) + bonus;
    solvedThisHint = true;
    $("answer").className = "good";
    $("msg").textContent = "Correct!";
    $("msg").className = "ok";
    playing = false;
    setTimeout(() => {
      playing = true;
      $("answer").className = "";
      nextRound();
    }, 700);
  } else {
    misses++;
    $("answer").className = "bad";
    $("msg").textContent = "Wrong! " + (MAX_MISSES - misses) + " hearts left.";
    $("msg").className = "err";
    $("answer").value = "";
    if (misses >= MAX_MISSES) {
      end(false);
    } else {
      updateHud();
    }
  }
}

function hint() {
  if (!playing) return;
  if (!hintUsed) {
    hintUsed = true;
    $("msg").textContent = "Hint: " + deck[round].h;
    $("msg").className = "";
  }
}

function start() {
  score = 0;
  misses = 0;
  round = 0;
  playing = true;
  deck = shuffle(RIDDLES);
  $("startScreen").classList.add("hidden");
  $("endOverlay").classList.add("hidden");
  $("playScreen").classList.remove("hidden");
  $("answer").disabled = false;
  $("submitBtn").disabled = false;
  $("hintBtn").disabled = false;
  showRiddle();
}

$("startBtn").addEventListener("click", start);
$("restartBtn").addEventListener("click", start);
$("submitBtn").addEventListener("click", submit);
$("hintBtn").addEventListener("click", hint);
$("answer").addEventListener("keydown", (e) => {
  if (!playing) return;
  if (e.key === "Enter") { e.preventDefault(); submit(); }
  if (e.key.toLowerCase() === "h" && !$("answer").value) {
    e.preventDefault();
    hint();
  }
});
