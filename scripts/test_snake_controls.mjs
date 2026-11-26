import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for (const variant of ['Snake', 'SnakeHacked']) {
  const els = new Map(), keys = new Map();
  function element(id) {
    if (!els.has(id)) els.set(id, {addEventListener(){}, classList:{add(){},remove(){}}, textContent:''});
    return els.get(id);
  }
  const document = {
    addEventListener:(event, callback)=>keys.set(event, callback), getElementById:element,
    querySelector:element, querySelectorAll:()=>[], hidden:false,
  };
  element('gameCanvas').width = 400;
  element('gameCanvas').getContext=()=>({});
  const ctx = vm.createContext({document, CanvasRenderingContext2D:class {},
    setInterval:()=>1, clearInterval(){},localStorage:{getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}}});
  const code = fs.readFileSync(new URL('../Games/'+variant+'/game.js', import.meta.url), 'utf8');
  vm.runInContext(code+'\nSnakeGame.prototype.drawGame=function(){}; globalThis.game=new SnakeGame();',ctx);
  const game = ctx.game;
  assert.equal(game.highScore,0);
  game.startGame();
  game.turn('left'); assert.equal(game.turns.length,0);
  game.turn('up');game.turn('left');game.turn('down');
  assert.equal(game.turns.length,2);
  game.update();assert.deepEqual([game.snake[0].x,game.snake[0].y],[10,9]);
  game.update();assert.deepEqual([game.snake[0].x,game.snake[0].y],[9,9]);
  document.hidden=true;keys.get('visibilitychange')();
  assert.equal(game.gamePaused,true);game.turn('up');assert.equal(game.turns.length,0);
  keys.get('keydown')({key:'p',code:'KeyP',repeat:false,preventDefault(){}});
  assert.equal(game.gamePaused,false);
  if(variant==='Snake'){
    game.snake=[{x:1,y:1},{x:1,y:2},{x:2,y:2},{x:2,y:1}];
    assert.equal(game.checkCollision({x:2,y:1}),false);
    assert.equal(game.checkCollision({x:1,y:2}),true);
  }
  game.tileCount=2;
  game.snake=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];
  game.generateFood();assert.deepEqual([game.food.x,game.food.y],[1,1]);
  game.snake.push({x:1,y:1});game.generateFood();
  assert.equal(game.gameRunning,false);assert.equal(element('#game-over h2').textContent,'Board complete!');
  console.log('PASS '+variant+' buffered turns, pause, storage denial, full-board finish and final free cell');
}
