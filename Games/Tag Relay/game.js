/*
@title: 2 Player Tag Game
@author: Leo B
@description: Simple tag game, WASD for red, IJKL for blue. Red has to try catch blue within the time limit, if they do, red gets the point. If blue evades, blue gets the point. First to 7 points wins.
@tags: ['2 Player']
@addedOn: 2025-11-04
*/

// Adapted lifecycle/timing; original.js preserves the pinned source unchanged.
export function createTagGame(api, changed) {
const {tune, bitmap, map, color, setLegend, setMap, setBackground, setSolids,
  getTile, getFirst, tilesWith, onInput, afterInput, addText, clearText, playTune} = api;
const restart = tune`
473.6842105263158,
157.89473684210526: E4/157.89473684210526,
157.89473684210526: E4~157.89473684210526,
473.6842105263158,
157.89473684210526: G4/157.89473684210526,
157.89473684210526: G4~157.89473684210526,
315.7894736842105,
157.89473684210526: B4/157.89473684210526,
157.89473684210526: B4~157.89473684210526,
473.6842105263158,
157.89473684210526: D5/157.89473684210526,
157.89473684210526: D5/157.89473684210526,
157.89473684210526: D5/157.89473684210526,
1894.7368421052631`
const music = tune`
109.89010989010988: C4~109.89010989010988,
109.89010989010988: C4-109.89010989010988,
109.89010989010988: C4~109.89010989010988,
109.89010989010988: C5/109.89010989010988,
109.89010989010988: C4~109.89010989010988,
109.89010989010988: G4/109.89010989010988,
109.89010989010988: D4~109.89010989010988,
109.89010989010988: C4^109.89010989010988,
109.89010989010988: D4~109.89010989010988,
109.89010989010988: F4-109.89010989010988,
109.89010989010988: D4~109.89010989010988,
109.89010989010988: C4/109.89010989010988,
109.89010989010988: E4~109.89010989010988,
109.89010989010988: D4^109.89010989010988,
109.89010989010988: E4~109.89010989010988,
109.89010989010988: F4^109.89010989010988,
109.89010989010988: E4~109.89010989010988,
109.89010989010988: B4/109.89010989010988,
109.89010989010988: F4~109.89010989010988,
109.89010989010988: C4-109.89010989010988,
109.89010989010988: F4~109.89010989010988,
109.89010989010988: A4^109.89010989010988,
109.89010989010988: F4~109.89010989010988,
109.89010989010988: A4/109.89010989010988,
109.89010989010988: G4~109.89010989010988,
109.89010989010988: A4^109.89010989010988,
109.89010989010988: G4~109.89010989010988,
109.89010989010988: E4-109.89010989010988,
109.89010989010988: G4~109.89010989010988,
109.89010989010988: C5^109.89010989010988,
109.89010989010988: D4~109.89010989010988 + B4/109.89010989010988,
109.89010989010988: D4~109.89010989010988 + G4-109.89010989010988`
const player = "p"
const player2 = "2"
const wall = "w"
const endColor = "e"
const background = "b"
let level = 0;
let redScore = 0, blueScore = 0;
let gameActive = true, paused = false, disposed = false;
let phase = 'round', elapsed = 0, last = performance.now(), timer = null;
let message = 'Red chases Blue. First to 7.';
let playback = null, pointTune = null;
setLegend(
  [ player, bitmap`
................
................
................
................
....33333333....
....33333333....
....33333333....
....30033003....
....30033003....
....33333333....
....33333333....
....33333333....
................
................
................
................` ],
  [ player2, bitmap`
................
................
................
................
....77777777....
....77777777....
....77777777....
....70077007....
....70077007....
....77777777....
....77777777....
....77777777....
................
................
................
................`],
  [wall, bitmap`
1111111111111111
11LLLLLLLLLLLL11
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
1LLLLLLLLLLLLLL1
11LLLLLLLLLLLL11
1111111111111111`],
  [background, bitmap`
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222`],
  [endColor, bitmap`
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222
2222222222222222`],

)


const end = map`
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee
eeeeeeeeeeee`

setBackground(background)



// only walls are solid
setSolids([wall])

function canMove(sprite, dx, dy) {
  const x = sprite.x + dx
  const y = sprite.y + dy
  const things = getTile(x, y)
  // if there’s any wall in the target tile, block the move
  return !things.some(t => t.type === wall)
}







// Player 1 movement
onInput("s", () => {
  if (!gameActive || paused) return
  const p = getFirst(player)
  if (p && canMove(p, 0, 1) && gameActive)
    p.y += 1
})

onInput("w", () => {
  if (!gameActive || paused) return
  const p = getFirst(player)
  if (p && canMove(p, 0, -1) && gameActive)
  p.y -= 1
})

onInput("d", () => {
  if (!gameActive || paused) return
  const p = getFirst(player)
  if (p && canMove(p, 1, 0) && gameActive)
    p.x += 1
})

onInput("a", () => {
  if (!gameActive || paused) return
  const p = getFirst(player)
  if (p && canMove(p, -1, 0) && gameActive)
    p.x -= 1
})

// Player 2 movement
onInput("k", () => {
  if (!gameActive || paused) return
  const p2 = getFirst(player2)
  if (p2 && canMove(p2, 0, 1) && gameActive)
    p2.y += 1
})

onInput("i", () => {
  if (!gameActive || paused) return
  const p2 = getFirst(player2)
  if (p2 && canMove(p2, 0, -1) && gameActive)
    p2.y -= 1
})

onInput("l", () => {
  if (!gameActive || paused) return
  const p2 = getFirst(player2)
  if (p2 && canMove(p2, 1, 0) && gameActive)
    p2.x += 1
})

onInput("j", () => {
  if (!gameActive || paused) return
  const p2 = getFirst(player2)
  if (p2 && canMove(p2, -1, 0) && gameActive)
    p2.x -= 1
})




const levels = [
  map`
p...........
.....w......
............
.........w..
............
............
..w.........
........w...
...........2`,
  map`
p...........
.......w....
............
.w..........
............
.....w......
............
............
...........2`,
  map`
p.w.........
w...........
............
......w.....
............
....w.......
............
...........w
.........w.2`,
  map`
p...........
............
............
....wwww....
....wwww....
....wwww....
............
............
...........2`,
  map`
2...........
...w...w....
............
............
............
..w.....w...
........w...
............
...........p`,
  map`
p...........
.......w....
............
............
............
....w.......
............
............
.........w.2`,
  map`
p.....w.....
............
......w.....
............
......w.....
...w........
............
......w.....
......w....2`,
  map`
p..........w
..........w.
.....w......
............
........w...
.....w......
............
.w..........
w..........2`,
  map`
...w....w...
....w..w....
p....ww....2
............
............
............
....w..w....
............
....w..w....`,
  map`
p...........
.....w......
............
.........w..
............
............
..w.........
........w...
...........2`,
  map`
p...........
.......w....
............
.w..........
............
.....w......
............
............
...........2`,
  map`
p.w.........
w...........
............
......w.....
............
....w.......
............
...........w
.........w.2`,
  map`
p...........
............
............
....wwww....
....wwww....
....wwww....
............
............
...........2`,
  map`
2...........
...w...w....
............
............
............
..w.....w...
........w...
............
...........p`,
  ]


function stopMusic() {
  playback?.end(); pointTune?.end();
  playback = pointTune = null;
}
function update() {
  clearText();
  if (phase !== 'round') addText(message, {x: 5, y: 5, color: color`0`});
  changed(snapshot());
}
function stopTimer() {
  clearInterval(timer); timer = null;
}
function award(red) {
  if (!gameActive || paused || disposed) return;
  gameActive = false;
  if (red) redScore++; else blueScore++;
  elapsed = 0;
  stopMusic();
  message = red ? 'Red Point' : 'Blue Point';
  if (redScore === 7 || blueScore === 7) {
    phase = 'won'; message = redScore === 7 ? 'Red Wins!' : 'Blue Wins!';
    setMap(end); stopTimer();
  } else {
    phase = 'between'; pointTune = playTune(restart, 1);
  }
  update();
}
function tick() {
  if (disposed || paused || phase === 'won') return;
  const now = performance.now();
  elapsed += now - last; last = now;
  if (phase === 'round') {
    if (tilesWith(player, player2).length) award(true);
    else if (elapsed >= 7000) award(false);
  } else if (elapsed >= 1500) {
    level++; elapsed = 0; phase = 'round'; gameActive = true;
    setMap(levels[level]); stopMusic(); playback = playTune(music, Infinity);
    message = 'Red chases Blue. First to 7.';
  }
  update();
}
function startTimer() {
  stopTimer(); last = performance.now(); timer = setInterval(tick, 50);
}
afterInput(() => {
  if (!gameActive || paused || disposed) return;
  if (tilesWith(player, player2).length) award(true);
  else update();
});
function snapshot() {
  const position = type => {
    const sprite = getFirst(type);
    return sprite ? Object.freeze({x: sprite.x, y: sprite.y}) : null;
  };
  return Object.freeze({phase, paused, redScore, blueScore, arena: level + 1,
    remaining: phase === 'round' ? Math.max(0, 7 - elapsed / 1000) : 0,
    message, red: position(player), blue: position(player2),
    timers: timer === null ? 0 : 1});
}
setMap(levels[level]); playback = playTune(music, Infinity); startTimer(); update();
return {
  snapshot,
  pause(value) {
    if (disposed || phase === 'won' || paused === value) return;
    if (value) {
      tick();
      if (phase === 'won') return;
      paused = true; stopTimer(); stopMusic();
    }
    else { paused = false; startTimer();
      if (phase === 'round') playback = playTune(music, Infinity); }
    update();
  },
  cleanup() { disposed = true; gameActive = false; stopTimer(); stopMusic(); }
};
}
