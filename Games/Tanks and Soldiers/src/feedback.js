// Gameplay-time feedback, attributed to the human controller at firing time.
export function playerCombat(world,player) {
  const age=e=>world.time-e.time;
  const confirm=world.events.findLast(e=>(e.type==='hit'||e.type==='destroyed')&&e.controllerId===player.id&&age(e)>=0&&age(e)<.8)??null;
  const incoming=world.events.findLast(e=>e.type==='hit'&&(e.targetId===player.id||e.targetId===player.seatId)&&age(e)>=0&&age(e)<.8)??null;
  const shot=world.events.some(e=>e.type==='shot'&&e.controllerId===player.id&&age(e)>=0&&age(e)<.12);
  return {confirm,incoming,shot};
}
