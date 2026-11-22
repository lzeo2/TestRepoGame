const PRACTICE_GEAR = Object.freeze({
  drone: true, droneStrike: true, jetpack: true, scanner: true,
  armour: 100, flares: 12, grenades: 6, smokeGrenades: 6,
  medkits: 3, repairKits: 3, jammers: 3,
});

export function gearForMode(careerGear, sandbox) {
  return sandbox ? PRACTICE_GEAR : careerGear;
}
