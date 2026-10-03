// Original fictional parked-study data. Not live fleet replacements or performance claims.
// Length fractions run toward +Z at the rear; roofWidth is full width in meters.
// Every leaf is primitive, so freezing each profile and its map freezes all data.
export const UTILITY_STUDIES = Object.freeze({
  // Short enclosed cargo body, upright screen and broad panel-van roof.
  parcel: Object.freeze({
    id: 'parcel', name: 'Parcel Cub', color: '#daa848', roofColor: '#e4c47c',
    width: 1.76, length: 3.72, height: 1.83, wheelbase: 2.46, bodyHeight: 0.93,
    cabinFront: -0.30, cabinRear: 0.43, roofFront: -0.23, roofRear: 0.36,
    roofWidth: 1.52, form: 'panel', doors: 2, plate: 'CUB 24',
  }),
  // Compact rally hatch: shorter roof and more tapered shoulders than the vans.
  pebble: Object.freeze({
    id: 'pebble', name: 'Pebble Rally', color: '#dd8138', roofColor: '#e6d6b7',
    width: 1.86, length: 3.80, height: 1.59, wheelbase: 2.48, bodyHeight: 0.85,
    cabinFront: -0.28, cabinRear: 0.34, roofFront: -0.16, roofRear: 0.20,
    roofWidth: 1.43, form: 'rally', doors: 2, plate: 'PBL 38',
  }),
  // Long, tall van: forward cab and near-full-length upright cargo enclosure.
  dockside: Object.freeze({
    id: 'dockside', name: 'Dockside Van', color: '#638d9d', roofColor: '#bcc8c9',
    width: 2.02, length: 5.12, height: 2.08, wheelbase: 3.58, bodyHeight: 1.00,
    cabinFront: -0.39, cabinRear: 0.45, roofFront: -0.31, roofRear: 0.385,
    roofWidth: 1.85, form: 'van', doors: 2, plate: 'DOCK 51',
  }),
  // Four-door scout: taller passenger compartment and less cab-forward stance.
  gravel: Object.freeze({
    id: 'gravel', name: 'Gravel Scout', color: '#7a8572', roofColor: '#d0ccb9',
    width: 2.06, length: 4.46, height: 1.91, wheelbase: 2.90, bodyHeight: 1.04,
    cabinFront: -0.26, cabinRear: 0.35, roofFront: -0.17, roofRear: 0.26,
    roofWidth: 1.72, form: 'utility', doors: 4, plate: 'SCOUT 46',
  }),
  // Two-door pickup: cabin ends before the rear axle, leaving a separate open bed.
  atlas: Object.freeze({
    id: 'atlas', name: 'Atlas Utility', color: '#b28a59', roofColor: '#d7c8ad',
    width: 2.18, length: 5.32, height: 1.98, wheelbase: 3.78, bodyHeight: 1.08,
    cabinFront: -0.31, cabinRear: 0.08, roofFront: -0.21, roofRear: 0.015,
    roofWidth: 1.88, form: 'pickup', doors: 2, plate: 'ATLAS 32',
  }),
});

// Generic sports proportions only; no OEM artwork, traced bodywork or branding.
export const SPORT_STUDIES = Object.freeze({
  // Compact rear-biased coupe: rearward canopy, longer nose, broad seated roof.
  kestrel: Object.freeze({
    id: 'kestrel', name: 'Kestrel R', color: '#a34d38', roofColor: '#d4bba0',
    width: 1.92, length: 4.18, height: 1.36, wheelbase: 2.59, bodyHeight: 0.78,
    cabinFront: -0.15, cabinRear: 0.35, roofFront: -0.015, roofRear: 0.225,
    roofWidth: 1.46, form: 'coupe', doors: 2, plate: 'KSTR 18',
  }),
  // Mid-engine wedge intention: forward canopy leaves a longer rear engine deck.
  // Lower belt preserves glazing/head space rather than flattening the cabin.
  vesper: Object.freeze({
    id: 'vesper', name: 'Vesper GT', color: '#586ca4', roofColor: '#343b4c',
    width: 2.04, length: 4.72, height: 1.27, wheelbase: 2.92, bodyHeight: 0.70,
    cabinFront: -0.30, cabinRear: 0.24, roofFront: -0.13, roofRear: 0.105,
    roofWidth: 1.50, form: 'hyper', doors: 2, plate: 'VSPR 72',
  }),
  // Flowing road hypercar: narrow teardrop canopy and broad rear cooling shoulders.
  aerolume: Object.freeze({
    id: 'aerolume', name: 'Aerolume', color: '#c57845', roofColor: '#343940',
    width: 2.18, length: 4.82, height: 1.16, wheelbase: 2.98, bodyHeight: 0.72,
    cabinFront: -0.32, cabinRear: 0.26, roofFront: -0.13, roofRear: 0.06,
    roofWidth: 1.24, form: 'hyper', doors: 2, plate: 'ALM 04',
  }),
  // Angular track prototype: forward compact canopy, long vented deck and high aerofoil.
  riftline: Object.freeze({
    id: 'riftline', name: 'Riftline', color: '#bbc3cc', roofColor: '#353841',
    width: 2.24, length: 4.92, height: 1.12, wheelbase: 3.06, bodyHeight: 0.70,
    cabinFront: -0.34, cabinRear: 0.19, roofFront: -0.16, roofRear: 0.035,
    roofWidth: 1.18, form: 'prototype', doors: 2, plate: 'RFT 07',
  }),
});
