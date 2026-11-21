// The supplied health is authoritative. This owner only clocks transient fire
// and returns damage requests for the controller to apply to that same car.
export function createVehicleDamage() {
  let key = null, health = 100, x = 0, z = 0, yaw = 0, burning = false, wrecked = false;
  let wreckRemaining = 0, age = 0, pendingDamage = 0;
  function reset() {
    key = null; health = 100; x = z = yaw = 0; burning = wrecked = false;
    wreckRemaining = age = pendingDamage = 0;
  }
  function step(dt, context) {
    if (!Number.isFinite(dt) || dt <= 0 || context?.paused) return;
    const car = context?.car, carKey = context?.carKey;
    if (!car || ![car.x, car.z, car.yaw, context.health].every(Number.isFinite) ||
      !(typeof carKey === 'string' && carKey.length > 0 || typeof carKey === 'number' && Number.isFinite(carKey))) {
      reset(); return;
    }
    dt = Math.min(.1, dt);
    if (key !== carKey) { reset(); key = carKey; }
    health = Math.max(0, Math.min(100, context.health));
    x = car.x; z = car.z; yaw = car.yaw;
    if (health > 30) { burning = false; wrecked = false; wreckRemaining = age = pendingDamage = 0; return; }
    if (health === 0) {
      if (!wrecked) { wrecked = true; wreckRemaining = 10; age = 0; }
      burning = false; pendingDamage = 0;
      wreckRemaining = Math.max(0, wreckRemaining - dt);
      age += dt;
      return;
    }
    if (wrecked) { wrecked = false; wreckRemaining = 0; age = 0; }
    if (health <= 25) burning = true;
    if (burning) {
      age += dt;
      pendingDamage = Math.min(health, pendingDamage + dt * 2);
    }
  }
  function snapshot() {
    const fire = burning ? 1 : wreckRemaining / 10;
    return Object.freeze({ carKey: key, active: key !== null, health, x, z, yaw, severity: (100 - health) / 100,
      burning, wrecked, fire, smoke: burning ? 1 : Math.min(1, fire * 1.5), wreckRemaining, age });
  }
  function drainEvents() {
    if (pendingDamage <= 0 || key === null) return [];
    const event = Object.freeze({ type: 'burnDamage', carKey: key, damage: pendingDamage });
    pendingDamage = 0; return [event];
  }
  return { step, snapshot, drainEvents, reset };
}

export const VEHICLE_FIRE_LIMITS=Object.freeze({tracked:8,visible:4,viewRange:170});
const EMPTY_FIRES=Object.freeze([]);
const isLiveCar=car=>car&&car.active!==false&&typeof car.id==='string'&&car.id!=='player'&&
  [car.x,car.z,car.yaw,car.health??100].every(Number.isFinite);

// Only recently hit or burning identities are retained. Existing vehicle
// owners still apply the burn damage and control the vehicle lifecycle.
export function createVehicleFires({resolve,damage,heightAt}) {
  const fires=new Map(),explosions=[];
  let serial=0;
  function recordShot(car,previousHealth) {
    if(!isLiveCar(car)||!Number.isFinite(car.health)||!Number.isFinite(previousHealth)||car.health>=previousHealth)return false;
    let record=fires.get(car.id);
    if(record&&(record.car!==car||previousHealth>=100)){
      fires.delete(car.id);record=null;
    }
    if(!record){
      if(fires.size===VEHICLE_FIRE_LIMITS.tracked){
        const idle=[...fires].find(([,entry])=>entry.phase==='hit');
        if(!idle)return false;
        fires.delete(idle[0]);
      }
      record={car,hits:0,age:0,phase:'hit'};
      fires.set(car.id,record);
    }
    if(record.phase!=='hit')return false;
    record.hits++;record.age=0;
    if(record.hits>=2&&car.health<=25){record.phase='fire';return true;}
    return false;
  }
  function step(dt) {
    if(!Number.isFinite(dt)||dt<=0||!fires.size)return;
    dt=Math.min(.1,dt);
    for(const [id,record] of fires){
      const car=record.car;
      if(!isLiveCar(car)||resolve(id)!==car||car.health>30&&record.phase!=='hit'){
        fires.delete(id);continue;
      }
      record.age+=dt;
      if(record.phase==='hit'){
        if(record.age>5||car.health<=0||car.health>=100)fires.delete(id);
        continue;
      }
      if(record.phase==='wreck'){
        if(record.age>=7)fires.delete(id);
        continue;
      }
      if(car.health>0)damage(id,Math.min(car.health,dt*5));
      if(!isLiveCar(car)){fires.delete(id);continue;}
      if(car.health<=0&&record.age>=.7){
        const y=heightAt(car);
        if(Number.isFinite(y)){
          if(explosions.length===VEHICLE_FIRE_LIMITS.tracked)explosions.shift();
          explosions.push(Object.freeze({id:`vehicle-fire:${++serial}`,type:'explosion',sourceVehicleId:id,
            kind:'vehicle-fire',x:car.x,y:y+.75,z:car.z,radius:5,maxDamage:40,interiorId:null}));
        }
        record.phase='wreck';record.age=0;
      }
    }
  }
  function snapshot(focus) {
    if(!fires.size||!focus)return EMPTY_FIRES;
    const visible=[];
    for(const {car,age,phase} of fires.values()){
      if(phase==='hit'||!isLiveCar(car))continue;
      const distance=Math.hypot(car.x-focus.x,car.z-focus.z);
      if(distance>VEHICLE_FIRE_LIMITS.viewRange)continue;
      const y=heightAt(car);
      if(Number.isFinite(y))visible.push({x:car.x,y,z:car.z,yaw:car.yaw,length:car.length,age,distance,
        fire:phase==='fire'?1:Math.max(0,1-age),smoke:phase==='fire'?1:Math.max(0,1-age/7)});
    }
    visible.sort((a,b)=>a.distance-b.distance);
    return visible.slice(0,VEHICLE_FIRE_LIMITS.visible);
  }
  function drainExplosions(){return explosions.length?explosions.splice(0):EMPTY_FIRES;}
  return {recordShot,step,snapshot,drainExplosions,
    reset(){fires.clear();explosions.length=0;},get tracked(){return fires.size;}};
}
