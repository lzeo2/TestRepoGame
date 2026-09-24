/*
 * Backgammon UI (new, dependency-free, flat) driving the ingested
 * binarymax/backgammon.js rules engine (engine.js) and AI (brain.js), MIT.
 * Player is white (moves 24 down to 1, bears off past point 1);
 * the computer plays black (moves 1 up to 24, bears off past 24).
 * Board layout: snake rows of four points so every point is a >=44px
 * target on a 360px phone. No jQuery, no drag-drop, no images.
 */
(function(){
"use strict";

/* Snake layout, left to right. White walks this list top to bottom. */
var ROWS = [
  [24,23,22,21],
  [17,18,19,20],
  [16,15,14,13],
  null,                 /* bar row spans the board between 13 and 12 */
  [9,10,11,12],
  [8,7,6,5],
  [1,2,3,4]
];
var OFF = 999;          /* engine target for bearing off */
var BAR_SRC = 24;       /* engine source for white on the bar */
var STACK_BOX = 30;     /* px budget for a checker stack inside a point */

var game = null;
var sel = null;             /* engine source: 0..23 index, or BAR_SRC */
var session = false;
var matchOver = false;
var score = 0, won = 0, lost = 0, matchPts = 0;
var pts = {};               /* display point 1..24 -> {btn, slot, num} */

function $(id){ return document.getElementById(id); }

function idx(p){ return p - 1; }              /* display point -> engine index */
function pointOf(i){ return i + 1; }          /* engine index -> display point */

/* ---------- board construction ---------- */
function makeCell(cls, tag){
  var el = document.createElement(tag || "div");
  el.className = cls;
  return el;
}

function makeTray(id, label, interactive){
  var el = document.createElement(interactive ? "button" : "div");
  el.className = "tray";
  if(interactive){ el.type = "button"; el.id = id; }
  var lbl = makeCell("lbl");
  lbl.textContent = label;
  var stack = makeCell("stack");
  stack.dataset.role = "stack";
  el.appendChild(lbl);
  el.appendChild(stack);
  return el;
}

function makePoint(p){
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "point" + (p % 2 ? " alt" : "");
  btn.dataset.p = p;
  var num = makeCell("num");
  num.textContent = p;
  var slot = makeCell("slot");
  btn.appendChild(num);
  btn.appendChild(slot);
  btn.addEventListener("click", function(){ clickPoint(p); });
  pts[p] = { btn: btn, slot: slot, lbl: null };
  return btn;
}

function buildBoard(){
  var board = $("board");
  board.textContent = "";
  pts = {};
  var r, i, cell;
  for(r = 0; r < ROWS.length; r++){
    if(ROWS[r] === null){
      /* bar row */
      var bar = makeCell("bar");
      var barW = document.createElement("button");
      barW.type = "button";
      barW.className = "barslot";
      barW.id = "barW";
      var bl = makeCell("lbl");
      bl.id = "barWLbl";
      bl.textContent = "Bar";
      var bstack = makeCell("stack");
      bstack.id = "barWStack";
      barW.appendChild(bl);
      barW.appendChild(bstack);
      barW.addEventListener("click", clickBar);
      var dw = makeCell("dicewrap");
      dw.innerHTML = '<span class="die empty" id="die0">-</span>' +
                     '<span class="die empty" id="die1">-</span>' +
                     '<span class="dicelbl" id="dicelbl">Dice</span>';
      var barB = makeCell("barslot");
      var bbl = makeCell("lbl");
      bbl.id = "barBLbl";
      bbl.textContent = "Bar";
      var bbstack = makeCell("stack");
      bbstack.id = "barBStack";
      barB.appendChild(bbl);
      barB.appendChild(bbstack);
      bar.appendChild(barW);
      bar.appendChild(dw);
      bar.appendChild(barB);
      board.appendChild(bar);
      continue;
    }
    /* gutter cell first */
    if(r === 0){
      cell = makeTray(null, "Black off", false);
      cell.id = "offB";
      board.appendChild(cell);
    } else if(r === ROWS.length - 1){
      cell = makeTray("offW", "Off", true);
      cell.addEventListener("click", clickOff);
      board.appendChild(cell);
    } else {
      cell = makeCell("gut empty");
      cell.setAttribute("aria-hidden", "true");
      board.appendChild(cell);
    }
    for(i = 0; i < ROWS[r].length; i++) board.appendChild(makePoint(ROWS[r][i]));
  }
}

/* ---------- small helpers ---------- */
function setStack(host, count, cap, cls){
  host.textContent = "";
  var n = Math.min(count, cap), i, el;
  for(i = 0; i < n; i++){
    el = document.createElement("span");
    el.className = "ck " + cls;
    host.appendChild(el);
  }
}

function fillPoint(p){
  var w = game.pieces.white[idx(p)];
  var b = game.pieces.black[idx(p)];
  var host = pts[p].slot;
  host.textContent = "";
  var counts = w ? [w, "w"] : (b ? [b, "b"] : null);
  if(counts){
    var h = Math.max(2, Math.min(11, Math.floor(STACK_BOX / counts[0])));
    for(var i = 0; i < counts[0]; i++){
      var el = document.createElement("span");
      el.className = "ck " + counts[1];
      el.style.height = h + "px";
      host.appendChild(el);
    }
  }
}

function computeTargets(src){
  var out = {};
  var cand = (game.okmoves && game.okmoves[game.movenum]) || [];
  for(var i = 0; i < cand.length; i++){
    var m = cand[i];
    if(m.source !== src) continue;
    if(game.okmove(m.source, m.target)) out[m.target] = 1;
  }
  return out;
}

function playerTurn(){
  return session && game && !matchOver && !game.winner && game.wtm === true;
}

function movesLeft(){
  var d = game.rolls[game.movenum];
  if(!d) return 0;
  var allowed = d.doubles ? 4 : 2;
  var used = (game.okmoves[game.movenum] || []).moved || 0;
  return Math.max(0, allowed - used);
}

function note(msg){ $("note").textContent = msg; }

function setDie(n, v){
  var el = $("die" + n);
  if(v == null){
    el.textContent = "-";
    el.classList.add("empty");
  } else {
    el.textContent = v;
    el.classList.remove("empty");
  }
}

/* ---------- rendering ---------- */
function render(){
  if(!game) return;
  var targets = sel != null ? computeTargets(sel) : {};

  for(var p = 1; p <= 24; p++){
    fillPoint(p);
    var rec = pts[p];
    var src = idx(p);
    rec.btn.classList.toggle("sel", sel === src);
    rec.btn.classList.toggle("target", !!targets[src]);
    var w = game.pieces.white[src], b = game.pieces.black[src];
    rec.btn.setAttribute("aria-label",
      "Point " + p + ", " + w + " white, " + b + " black" +
      (targets[src] ? ", legal destination" : ""));
  }

  /* white bar (selectable source) */
  var barW = $("barW");
  $("barWLbl").textContent = "Bar " + game.pieces.barwhite;
  setStack($("barWStack"), game.pieces.barwhite, 6, "w");
  barW.classList.toggle("sel", sel === BAR_SRC);
  barW.classList.toggle("target", false);
  barW.setAttribute("aria-label", "White bar, " + game.pieces.barwhite + " checkers waiting");

  /* black bar (display only) */
  $("barBLbl").textContent = "Bar " + game.pieces.barblack;
  setStack($("barBStack"), game.pieces.barblack, 6, "b");

  /* off trays */
  var offBStack = $("offB").querySelector(".stack");
  setStack(offBStack, game.pieces.offblack, 6, "b");
  $("offB").querySelector(".lbl").textContent = "Black off " + game.pieces.offblack;
  var offW = $("offW");
  setStack(offW.querySelector(".stack"), game.pieces.offwhite, 6, "w");
  offW.querySelector(".lbl").textContent = "Off " + game.pieces.offwhite;
  offW.classList.toggle("target", !!targets[OFF]);

  /* dice and status */
  var d = game.rolls[game.movenum];
  setDie(0, d ? d.die1 : null);
  setDie(1, d ? d.die2 : null);
  $("dicelbl").textContent = game.wtm ? "Your dice" : "Computer dice";

  var txt;
  if(matchOver) txt = "Match over.";
  else if(!game.wtm) txt = "Computer's turn.";
  else if(!d) txt = "Rolling...";
  else {
    txt = "Your move. Dice: " + d.die1 + " and " + d.die2 +
          (d.doubles ? " (doubles: four moves)" : "") +
          ". Moves left: " + movesLeft() + ".";
    if(game.onbar()) txt += " Select the bar to re-enter from it.";
  }
  $("status").textContent = txt;
  $("hudScore").textContent = score;
  $("hudRecord").textContent = "Won " + won + " : Lost " + lost;
}

/* ---------- turns ---------- */
function clickPoint(p){
  if(!playerTurn()) return;
  var src = idx(p);
  if(sel == null){
    if(game.onbar()){
      note(game.pieces.barwhite > 0
        ? "You must re-enter from the bar first."
        : "The computer must re-enter from the bar.");
      return;
    }
    if(game.pieces.white[src] > 0){ sel = src; note("Checker on point " + p + " selected. Tap a glowing destination."); }
    else note("Pick one of your own checkers.");
  } else if(src === sel){
    sel = null;
    note("Selection cleared.");
  } else {
    var t = computeTargets(sel);
    if(t[src]){ return doMove(sel, src); }
    if(game.pieces.white[src] > 0 && !game.onbar()){ sel = src; note("Checker on point " + p + " selected."); }
    else note("That point is not a legal destination for the selected checker.");
  }
  render();
}

function clickBar(){
  if(!playerTurn()) return;
  if(!game.onbar() || game.pieces.barwhite === 0){
    note("No checkers of yours are on the bar.");
    return;
  }
  sel = BAR_SRC;
  note("Bar selected. Tap a glowing entry point.");
  render();
}

function clickOff(){
  if(!playerTurn() || sel == null) return;
  if(computeTargets(sel)[OFF]) doMove(sel, OFF);
  else note("The selected checker cannot bear off yet.");
}

function doMove(src, tgt){
  var m = game.okmove(src, tgt);
  if(!m){ note("Illegal move."); return; }
  sel = null;
  if(m.hit){ score += 5; matchPts += 5; note("Blot hit! +5 points."); }
  else if(tgt === OFF){ score += 2; matchPts += 2; note("Bore off a checker. +2 points."); }
  else note("");
  game.move(m);
  if(game.winner){ endMatch(); return; }
  render();
}

function endMatch(){
  matchOver = true;
  var win = game.winner === "white";
  if(win){ score += 100; matchPts += 100; won++; } else { lost++; }
  render();
  $("resultTitle").textContent = win ? "You win the match" : "The computer wins the match";
  $("resultText").textContent = win
    ? "You bore off all fifteen checkers first."
    : "The computer bore off all fifteen checkers first.";
  $("resultPts").textContent = "+" + matchPts + " points this match";
  $("overlay").classList.remove("hidden");
  $("nextMatchBtn").focus();
}

/* engine UI adapter: called after every move and every dice roll */
var UI = {
  update: function(){ render(); },
  onroll: function(roll){
    render();
    if(roll !== game.rolls[game.movenum]){
      /* stale roll: that side had no legal play and was passed */
      note(roll.color === "white"
        ? "You had no legal play, so your turn was passed."
        : "The computer had no legal play and passed.");
    }
  }
};

/* ---------- session flow ---------- */
function newMatch(){
  matchOver = false;
  matchPts = 0;
  sel = null;
  buildBoard();
  game = backgammon.game({ ui: UI, black: backgammon.brain({ color: "black" }) });
  note("New match. You are white and move first.");
  game.start();
  render();
}

function showGame(on){
  $("startScreen").classList.toggle("hidden", on);
  $("gameScreen").classList.toggle("hidden", !on);
}

function toMenu(){
  session = false;
  $("overlay").classList.add("hidden");
  showGame(false);
  $("playBtn").focus();
}

$("playBtn").addEventListener("click", function(){
  session = true;
  showGame(true);
  newMatch();
});
$("menuBtn").addEventListener("click", toMenu);
$("overlayMenuBtn").addEventListener("click", toMenu);
$("newMatchBtn").addEventListener("click", function(){
  if(session) newMatch();
});
$("nextMatchBtn").addEventListener("click", function(){
  $("overlay").classList.add("hidden");
  newMatch();
});

})();
