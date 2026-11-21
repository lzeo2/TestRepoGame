export const CAR_RENTAL_OFFERS = Object.freeze([
  {modelId:'finch', name:'Compact', color:'#328b83', price:65},
  {modelId:'orchard', name:'Estate', color:'#e3dfd3', price:95},
  {modelId:'gravel', name:'SUV', color:'#667684', price:140},
].map(Object.freeze));

const RETURN_RADIUS = 3.1;
const STOP_SPEED = .6;
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const reject = message => ({ok:false,message});

export function createCarRental(sites, simulation, {pay, install, visible}) {
  let lease = null;
  function desk(ctx) {
    if (!ctx.onFoot || ctx.interior || ctx.passenger || ctx.recovering) return null;
    return sites.find(site => gap(ctx.pose,site) <= site.radius && visible(ctx.pose,site)) ?? null;
  }
  function rentalBay(ctx) {
    if (!lease || ctx.onFoot || ctx.interior || ctx.passenger || ctx.recovering || ctx.airborne) return null;
    return sites.find(site => gap(simulation.player,site.returnBay) <= RETURN_RADIUS &&
      visible(simulation.player,site.returnBay)) ?? null;
  }
  function rent(siteId, modelId, ctx) {
    if (lease) return reject('Return your rental before hiring another car.');
    const site = desk(ctx), offer = CAR_RENTAL_OFFERS.find(car => car.modelId === modelId);
    if (!site || site.id !== siteId || !offer) return reject('Visit the rental desk on foot.');
    if (ctx.busy || ctx.health <= 0) return reject('Finish your current activity before renting.');
    const car = simulation.player;
    const previous = {...ctx.vehicle, health:ctx.vehicleHealth, x:car.x, z:car.z, yaw:car.yaw};
    const pose = simulation.previewTeleport(site.pickup);
    if (!pose.ok || pose.adjusted || !simulation.canOccupy({...pose,modelId},{ignoreId:'player'}))
      return reject('The pickup bay is blocked. Try again when it clears.');
    const receipt = pay(modelId,ctx,() => simulation.teleport(pose).ok);
    if (!receipt.ok) return receipt;
    lease = {modelId, siteId, previous};
    install({...offer, health:100, stolen:false},'vehicle');
    return {...receipt,message:`${offer.name} rented. Return it to a rental bay before leaving the session.`};
  }
  function returnCar(ctx) {
    const site = rentalBay(ctx);
    if (!site) return reject('Bring the rental car to a marked return bay.');
    if (ctx.busy) return reject('Finish your current activity before returning the rental.');
    const car = simulation.player;
    if (Math.max(Math.abs(car.speed), Math.hypot(car.vx,car.vz)) > STOP_SPEED)
      return reject('Stop on the marked bay, then press E to return the rental.');
    const previous = lease.previous;
    const target = simulation.previewTeleport(previous);
    if (!target.ok || target.distance > 20 || !simulation.canOccupy({...target,modelId:previous.modelId},{ignoreId:'player'}))
      return reject('Your previous car is blocked. Try returning the rental again later.');
    const exit = {x:site.x,z:site.z,yaw:site.yaw,speed:0,jumpHeight:0};
    if (simulation.moveActor(exit,0,0,.45,{...target,modelId:previous.modelId,active:true}).blocked)
      return reject('The desk entrance is blocked. Try again when it clears.');
    if (!simulation.teleport(target).ok) return reject('Your previous car cannot be placed right now.');
    lease = null;
    install(previous,'foot',exit);
    return {ok:true,message:'Rental returned. Your previous car is back.'};
  }
  function recover() {
    if (!lease) return false;
    const previous = lease.previous;
    lease = null;
    install(previous,'vehicle');
    return true;
  }
  return {desk,rentalBay,rent,returnCar,recover,get active(){return lease!==null;},
    snapshot:()=>lease?{modelId:lease.modelId,siteId:lease.siteId}:null};
}
