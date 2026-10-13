// Detached browser fixture, never a live Roblox squad or player wallet.
import fs from 'node:fs';
import {Game} from '../js/game.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
let time=Date.now()/1000;
const game=new Game(data,{storage:null,clock:()=>time,random:()=>.2});
game.action('developerCode',{code:'DEVTEAM'});
for(let i=0;i<1200;i++){time+=.25;game.tick(.25);if(game.state.npcAttempt)game.action('defend',{tool:'whistle'});}
console.log(JSON.stringify(game.state));
