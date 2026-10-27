// Economic definitions only. modelType reuses the existing supplied kit; no new art is implied.
export const NEW_BUILDINGS = Object.freeze({
  apartments: { label: 'Apartments', cost: 420, hp: 180, upkeep: 0.055, power: 0.8, water: 1.1, capacity: 160, jobs: 0, income: 0, roadRequired: true, modelType: 'residential', unlockStage: 1 },
  workshop: { label: 'Workshop', cost: 280, hp: 180, upkeep: 0.035, power: 1.2, water: 0.6, capacity: 0, jobs: 64, income: 0.12, roadRequired: true, modelType: 'industrial', unlockStage: 1 },
  clinic: { label: 'Clinic', cost: 850, hp: 200, upkeep: 0.09, power: 1.2, water: 1, capacity: 0, jobs: 16, income: 0, serviceRadius: 12, serviceGrowth: 0.3, modelType: 'fire', unlockStage: 2 },
  school: { label: 'School', cost: 950, hp: 220, upkeep: 0.1, power: 1.5, water: 0.8, capacity: 0, jobs: 40, income: 0, serviceRadius: 20, serviceGrowth: 0.15, modelType: 'commercial', unlockStage: 2 },
  solar: { label: 'Solar plant', cost: 650, hp: 140, upkeep: 0.045, power: 0, water: 0, capacity: 0, jobs: 0, income: 0, utilityKind: 'power', supply: 28, modelType: 'power', unlockStage: 1 },
  river_pump: { label: 'River pump', cost: 550, hp: 160, upkeep: 0.065, power: 0, water: 0, capacity: 0, jobs: 0, income: 0, utilityKind: 'water', supply: 65, riverbank: true, modelType: 'water', unlockStage: 0 }
});

// Simulation seconds. Metadata only until the construction lane owns the clock.
export const BUILD_TIMES = Object.freeze({
  road: 3, bridge: 0, townhall: 0, residential: 4, commercial: 5, industrial: 6,
  power: 12, water: 10, police: 12, fire: 12, park: 3, wall: 3, watchtower: 6,
  apartments: 12, workshop: 10, clinic: 16, school: 18, solar: 10, river_pump: 10
});

// Absent legacy construction fields mean complete; supplies need no road to be a source.
export const isBuildingActive = building => building.hp > 0 && !(building.constructionRemaining > 0);
