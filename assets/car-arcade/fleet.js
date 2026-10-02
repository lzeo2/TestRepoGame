// Original fictional fleet. Prices and public field names are the frozen game ABI.
export const CARS = Object.freeze([
  ['bricklet', 'Bricklet80', 0, 25, 5.2, 2.6, 100, 'compact', '#927f63', 3.65, 1.68, 1.48],
  ['pip', 'Pip Borough', 900, 29, 6.2, 3.8, 85, 'compact', '#ce593f', 3.32, 1.72, 1.55],
  ['parcel', 'Parcel Cub', 1500, 27, 5.6, 2.9, 115, 'utility', '#daa848', 3.72, 1.76, 1.83],
  ['finch', 'Finch Sport', 2200, 34, 7.2, 4.1, 88, 'sport', '#4882b5', 3.96, 1.78, 1.30],
  ['lantern', 'Lantern Saloon', 3200, 35, 6.5, 3.2, 120, 'touring', '#755c94', 4.58, 1.86, 1.51],
  ['comet', 'Comet Coupe', 4800, 39, 8.0, 3.9, 94, 'sport', '#c74c55', 4.32, 1.90, 1.28],
  ['orchard', 'Orchard Wagon', 6200, 37, 6.8, 3.3, 128, 'touring', '#778a49', 4.82, 1.89, 1.62],
  ['pebble', 'Pebble Rally', 8200, 40, 8.3, 4.6, 125, 'compact', '#dd8138', 3.80, 1.86, 1.59],
  ['dockside', 'Dockside Van', 10500, 32, 5.8, 2.4, 150, 'utility', '#638d9d', 5.12, 2.02, 2.08],
  ['horizon', 'Horizon GT', 15000, 46, 9.2, 4.0, 115, 'touring', '#a75139', 4.92, 1.98, 1.35],
  ['morrow', 'Morrow Roadster', 22000, 47, 10.0, 4.7, 82, 'sport', '#d5b85a', 4.08, 1.84, 1.22],
  ['gravel', 'Gravel Scout', 30000, 41, 8.2, 3.5, 148, 'utility', '#7a8572', 4.46, 2.06, 1.91],
  ['relay', 'Relay Touring', 42000, 51, 10.2, 4.2, 130, 'touring', '#4868a0', 4.96, 1.94, 1.47],
  ['tempest', 'Tempest Sprint', 60000, 57, 11.6, 4.9, 98, 'sport', '#9b4d82', 4.38, 2.02, 1.24],
  ['atlas', 'Atlas Utility', 90000, 43, 8.8, 3.0, 160, 'utility', '#b28a59', 5.32, 2.18, 1.98],
  ['sunray', 'Sunray Halo', 160000, 65, 13, 5, 105, 'sport', '#e6a92d', 4.76, 2.12, 1.20],
].map(([id, name, price, speed, acceleration, handling, toughness, style, color, length, width, height]) =>
  Object.freeze({id, name, price, speed, acceleration, handling, toughness, style, color, length, width, height})));

export const BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(CARS.map(car => [car.id, car]))));
