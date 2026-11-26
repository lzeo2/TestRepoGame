import { expansionPlaces } from './map-expansion.js';
import { roadProfile } from './road-network.js';
import { isVehicleStopped } from './driving-dynamics.js';
import { planStealthChapter, STEALTH_CONTRACT_IDS } from './stealth-contracts.js';
import { ASSASSINATION_MISSION_ID } from './assassination-mission.js';

// Original fiction. Mission rooms and encounters are authored, not surveyed private spaces.
const clone = value => JSON.parse(JSON.stringify(value));
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const PARKING_MARGIN = 14;
const PARKING_MAX_SPEED = 1.2;
const SHARED_SEARCH_DURATION = [0, 26, 32, 38];
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export function createCampaign(map, saved = null, { meetingPoint, stealthContracts, assassinationMission } = {}) {
  if (meetingPoint !== undefined && !finitePoint(meetingPoint)) throw new Error('Campaign meeting point must be finite.');
  const place = (id, fallback) => map.landmarks.find(p => p.id === id) || fallback;
  const shop = map.landmarks.find(p => p.store && /coals/i.test(p.name));
  if (!finitePoint(map.spawn) || !finitePoint(shop)) throw new Error('Campaign requires the mapped spawn and Coals.');
  const centre = place('canberra-centre', { x: -456, z: -4500, name: 'Canberra Centre' });
  const kingston = place('kingston', { x: 923, z: 285, name: 'Kingston' });
  // GPS ends at named road vertices. Keep the parcel arrival on that same
  // public network rather than the schematic shops centre beyond the route.
  let deliveryApproach = kingston, deliveryDistance = 110;
  for (const road of map.roads || []) {
    if (!road.name || !['residential', 'living_street', 'tertiary', 'secondary', 'primary', 'unclassified'].includes(road.type) || !roadProfile(road).trafficAllowed) continue;
    for (let index = 0; index < road.points.length; index++) {
      if ((road.oneway === 1 && index === road.points.length - 1) || (road.oneway === -1 && index === 0) || road.points.length < 2) continue;
      const point = { x: road.points[index][0], z: road.points[index][1], name: `Kingston public approach on ${road.name}` };
      const gap = distance(point, kingston);
      if (gap < deliveryDistance) { deliveryApproach = point; deliveryDistance = gap; }
    }
  }
  const home = map.storyHomes?.basement || { roomId: 'story-milo-home', name: "Milo's safehouse", street: 'Kingston', x: kingston.x, z: kingston.z };
  if (!finitePoint(home) || typeof home.roomId !== 'string' || !home.roomId) throw new Error('Campaign home requires a finite entry and room identity.');
  const homeApproach = finitePoint(home.approach) ? home.approach : home;
  const homeName = home.name || "Milo's safehouse";
  const homeLocation = `${homeName} on ${home.street || 'the Kingston public approach'}`;
  const homeTask = { roomId: home.roomId, stationId: `${home.roomId}-stash`, hold: 0 };
  const redHill = place('redhill', { x: -1770, z: 1740, name: 'Red Hill' });
  const sourceBridge = map.roads?.length ? expansionPlaces(map).find(point => point.id === 'commonwealth-bridge') : null;
  const bridge = sourceBridge || place('commonwealth-bridge', { x: -1230, z: -2840, name: 'Commonwealth Avenue Bridge' });
  // Flynn Drive has a sourced public sidewalk. Recruit on its closest source
  // vertex rather than inventing a foot approach on the trunk bridge deck.
  const approachRoad = map.roads?.find(road => road.sourceId === 'way/5640616');
  const approachVertex = sourceBridge && approachRoad?.points.reduce((best, point) => !best || Math.hypot(point[0] - bridge.x, point[1] - bridge.z) < Math.hypot(best[0] - bridge.x, best[1] - bridge.z) ? point : best, null);
  const bridgeApproach = approachVertex ? { x: approachVertex[0], z: approachVertex[1] } : null;
  const school = map.schoolEntry || map.spawn;
  if (!finitePoint(school)) throw new Error('Campaign school entry must be finite.');
  const schoolRoomId = school.roomId || 'interior-telopea-school';
  const scene = (id, title, ...lines) => ({ id, title, lines: lines.map(([speaker, text]) => ({ speaker, text, duration: 3.5 })) });
  const crew = owner => ['student', 'corporate', 'basement'].filter(id => id !== owner);
  const target = (point, label, kind = 'drive', { radius = 26, ...extra } = {}) => ({
    x: point.x, z: point.z, label, kind, radius: radius + (extra.stop ? PARKING_MARGIN : 0), hold: 0, ...extra,
  });
  const loseSearch = (point, label, extra = {}) => target(point, label, 'escape', {
    anywhere: true, clear: true, requireWanted: false, ...extra,
  });
  const noodle = place('store-5656111023', { id: 'store-5656111023', x: -367.096, z: -4406.948, name: 'Lambzhou 1919' });
  const bookshop = place('store-12918449444', shop);
  const paperback = place('store-439239650', shop);
  const wholefoods = place('store-6275666787', shop);
  const crossingRoad = sourceBridge && map.roads.find(road => road.sourceId === sourceBridge.sourceId && roadProfile(road).trafficAllowed);
  const crossingVertex = crossingRoad?.points.reduce((north, point) => !north || point[1] < north[1] ? point : north, null);
  const bridgeCrossing = crossingVertex ? { x: crossingVertex[0], z: crossingVertex[1] } : bridge;
  const airport = place('canberra-airport', centre);
  let airportApproach = null, airportDistance = Infinity;
  for (const road of map.roads || []) {
    if (!road.name || !['residential', 'living_street', 'tertiary', 'secondary', 'primary', 'unclassified'].includes(road.type) || !roadProfile(road).trafficAllowed) continue;
    for (let index = 0; index < road.points.length; index++) {
      if ((road.oneway === 1 && index === road.points.length - 1) || (road.oneway === -1 && index === 0) || road.points.length < 2) continue;
      const point = { x: road.points[index][0], z: road.points[index][1] };
      const gap = distance(point, airport);
      if (gap < airportDistance) { airportApproach = point; airportDistance = gap; }
    }
  }
  airportApproach ||= centre;
  const shared = freeze([
    { id: 'late-parcel', character: 'basement', name: '1. Depot interception', contact: 'Mara, local fixer', reward: 350, time: 360, incident: true, wantedLevel: 2,
      cutscene: scene('late-parcel', 'The debt changes hands', ['Milo', 'The depot sold my debt twice. We need a getaway car before we intercept its collection.'], ['Mara', 'Kit and Rowan can cover you on foot outside. Stop the vehicle near Coals, then shake the search anywhere.']),
      briefing: 'Milo, the fraudulent depot is moving its collection case. Find any parked street vehicle, walk to its door and press E to get in (that counts as stealing it), then drive to the marked stop point outside Coals and come to a full stop. Kit and Rowan cover you on foot. Once the drop registers, drive anywhere and keep moving until the police search bar empties.',
      outro: 'Milo: Their getaway car is ours. The case names a ledger hidden behind the Coals counter.',
      stages: [target(map.spawn, 'Steal a street vehicle: walk to any parked car and press E to get in', 'stolen', { anywhere: true }), target(shop, 'Drive to the marked stop point outside Coals, stop fully, then keep moving until the police search clears', 'escape', { drive: true, stolen: true, clear: true, stop: true, radius: 36, requireWanted: false })] },
    { id: 'under-the-awning', character: 'student', name: '2. Ledger robbery', contact: 'Mara', reward: 450, time: 300,
      cutscene: scene('under-the-awning', 'A receipt for every lie', ['Kit', 'The depot kept our club refund in a second set of books. The ledger is at Coals.'], ['Mara', 'Rowan and Milo will cover the street outside. Complete the counter robbery, then leave in a car.']),
      briefing: 'Kit, drive to the marked stop point outside Coals, press E to step out and press E at the shop door to enter. Stand near the employee and aim your pistol to threaten them, then press E to demand the till handover and recover the depot ledger. Rowan and Milo cover the street outside. Walk back out (E leaves), press E beside a car and drive off, keeping clear of any police search.',
      outro: 'Kit: The ledger has every double charge. Jules can match the depot vehicles to these entries.',
      stages: [target(shop, 'Drive to the marked stop outside Coals, step out (E) and enter (E) to reach the counter robbery', 'robbery', { storeId: shop.id, hold: 0 }), loseSearch(shop, 'Walk out (E leaves), get in a car with E and lose any police following you', { drive: true })] },
    { id: 'borrowed-wheels', character: 'corporate', name: '3. Borrowed wheels', contact: 'Jules, garage mechanic', reward: 700, time: 480,
      cutscene: scene('borrowed-wheels', 'Hostile acquisition', ['Rowan', 'My employer signed off on this depot. Its fleet is the missing link.'], ['Jules', 'Steal a street vehicle. Kit and Milo cover the street on foot. Stop the car in Kingston and clear the search anywhere.']),
      briefing: 'Rowan, find any parked street vehicle, walk to its door and press E to get in, then drive to the marked stop point in Kingston and come to a full stop to mark the handover. Kit and Milo cover you on foot outside. Once the handover is marked, drive anywhere and keep moving until the police search bar empties.',
      outro: 'Rowan: The fleet and the false accounts match. The depot knows we have its evidence.',
      stages: [target(shop, 'Steal a street vehicle: walk to any parked car and press E to get in', 'stolen', { anywhere: true }), target(kingston, 'Drive to the marked stop point in Kingston, stop fully, then keep moving until the police search clears', 'escape', { drive: true, stolen: true, clear: true, stop: true, radius: 36, requireWanted: false })] },
    { id: 'quiet-streets', character: 'corporate', name: '4. Armed getaway', contact: 'Jules', reward: 800, time: 720, incident: true, wantedLevel: 3,
      cutscene: scene('quiet-streets', 'The handover was a trap', ['Rowan', 'They traced the handover. We are leaving together.'], ['Jules', 'Your crew is armed. Cover each other and lose the search.']),
      briefing: 'Rowan, the depot handover was a trap and the crew is leaving together. Kit and Milo defend the crew on their own; you just drive. Get in any car (press E at its door), then lose the police wherever you can.',
      outro: 'Rowan: Everyone is here. The ledger points to one final account across the lake.',
      stages: [loseSearch(redHill, 'Press E beside a car to get in, then lose the police anywhere', { drive: true, requireWanted: true })] },
    { id: 'across-the-water', character: 'student', name: '5. Bridge score', contact: 'Mara', reward: 1000, time: 660, incident: true, wantedLevel: 2,
      cutscene: scene('across-the-water', 'The last account', ['Kit', 'The Centre drop is the last escape route for the depot accountant. We get the ledger there first.'], ['Mara', 'Regroup with Rowan and Milo on Flynn Drive. They cover you on foot outside. Cross the bridge, then lose the police before the drop.']),
      briefing: 'Kit, get in any car (press E at its door), drive to the marked Flynn Drive stop point and come to a full stop to regroup with Rowan and Milo. Then follow the marked route and drive across Commonwealth Avenue Bridge. On the far side, drive to the marked Canberra Centre approach and stop, then keep moving until the police search empties to close the depot account.',
      outro: 'Kit: The evidence is delivered. The depot cannot collect those false debts again. Time to split the score.',
      stages: [...(bridgeApproach ? [target(bridgeApproach, 'Flynn Drive stop point: drive there and come to a full stop to regroup', 'drive', { stop: true })] : []), target(bridge, 'Drive across Commonwealth Avenue Bridge along the marked route', 'drive', { radius: 75, hold: 0 }), target(centre, 'Drive to the marked Canberra Centre approach and stop, then keep moving until the police search clears', 'escape', { drive: true, stop: true, clear: true, radius: 40, requireWanted: false })] },
    { id: 'home-by-the-lake', character: 'basement', name: '6. Split the score', contact: 'Mara', reward: 1200, time: 720,
      cutscene: scene('home-by-the-lake', 'Three shares, no debt', ['Milo', 'We started with a missing refund, a broken presentation and a debt collector.'], ['Mara', `Return to ${homeLocation}. Pack the recovered ledger inside, then meet us outside to split the money.`]),
      briefing: `Milo, drive home to ${homeLocation} and park at its marked approach, coming to a full stop. Press E to step out, press E at your front door to enter, and press Q at the case table to pack the recovered ledger. Walk out through the same door and lose any police following you before the final split. Kit and Rowan cover the street.`,
      outro: 'Mara: Three equal shares. The fake debts are gone. Rowan found another depot account in the ledger.',
      stages: [target(homeApproach, `Drive to the marked approach outside ${homeLocation} and come to a full stop`, 'drive', { stop: true }), target(home, `Inside ${homeLocation}: walk to the case table and press Q to pack the recovered ledger`, 'home-action', homeTask), loseSearch(homeApproach, `Walk out of ${homeLocation} (E leaves) and lose any police following you`)] },
    { id: 'shelf-life', character: 'corporate', name: '7. Shelf life', contact: 'Mara', reward: 1350, time: 1320,
      cutscene: scene('shelf-life', 'A second set of books', ['Rowan', 'Two stock orders repeat the depot charges. I can compare them by covering the actual shifts.'], ['Mara', 'Start at The Book Moo in Kingston, then cross the bridge to Lambzhou. Kit and Milo cover the street.']),
      briefing: `Rowan, drive to the marked stop outside ${bookshop.name} and come to a full stop. Press E at its door to enter, then press Q at the stock station to finish a real stock shift. Walk out (E leaves), get in your car and drive across Commonwealth Avenue Bridge. At ${noodle.name}, press E to enter and press Q at the noodle station to complete a noodle shift. Walk out and lose any police following you before comparing the two orders. Kit and Milo cover outside.`,
      outro: 'Rowan: Both orders paid the same shell account. The ledger lists two cash collections tomorrow.',
      stages: [target(bookshop, `Drive to the marked stop outside ${bookshop.name} and come to a full stop`, 'drive', { stop: true }), target(bookshop, `Inside ${bookshop.name}: walk to the marked stock station and press Q to complete the shift`, 'work', { storeId: bookshop.id, hold: 0 }), target(bridgeCrossing, 'Drive across Commonwealth Avenue Bridge to its marked north approach', 'drive', { radius: 45, hold: 0 }), target(noodle, `Inside ${noodle.name}: walk to the marked noodle station and press Q to complete the noodle shift`, 'work', { storeId: noodle.id, stationKind: 'noodle', hold: 0 }), loseSearch(noodle, 'Walk out of Lambzhou (E leaves) and lose any police following you')] },
    { id: 'two-till-problem', character: 'student', name: '8. Two till problem', contact: 'Mara', reward: 1600, time: 1080,
      cutscene: scene('two-till-problem', 'Separate collections', ['Kit', 'The ledger splits one collection between two tills. Taking only one leaves the depot a way back in.'], ['Mara', 'Paperback Chain first, Scoot Wholefoods second. Complete both handovers, then lose the police.']),
      briefing: `Kit, drive to the marked stop outside ${paperback.name} and press E at its door to enter. Stand near the employee, aim your pistol to threaten them and press E to complete the till handover. Walk out (E leaves), drive to the marked stop outside ${wholefoods.name} and repeat that separate handover inside. With both fresh receipts, leave the shop and lose any police following you.`,
      outro: 'Kit: Two collections recovered. Milo has the last copy of the account ready to go.',
      stages: [target(paperback, `Drive to the marked stop outside ${paperback.name} and come to a full stop`, 'drive', { stop: true }), target(paperback, `Inside ${paperback.name}: threaten the employee and press E to complete the till handover`, 'robbery', { storeId: paperback.id, hold: 0 }), target(wholefoods, `Drive to the marked stop outside ${wholefoods.name} for the second collection`, 'drive', { stop: true }), target(wholefoods, `Inside ${wholefoods.name}: threaten the employee and press E for the separate till handover`, 'robbery', { storeId: wholefoods.id, hold: 0 }), loseSearch(redHill, 'Walk out (E leaves) and lose any police following you')] },
    { id: 'carbon-copy', character: 'basement', combat: false, name: '9. Carbon copy', contact: 'Mara', reward: 1900, time: 1200,
      cutscene: scene('carbon-copy', 'One copy stays outside', ['Milo', 'The original is packed away. I am making a second copy, because I finally understand receipts.'], ['Mara', 'Pack it at home. Bring your car across the bridge, finish a kitchen shift at Lambzhou, then return to Kingston.']),
      briefing: `Milo, press E at your front door to enter ${homeLocation}, then press Q at the case table to pack a fresh copy. Walk out (E leaves), board your car (press E at its door) and drive it across Commonwealth Avenue Bridge along the marked route. At ${noodle.name}, press E to enter and press Q at the noodle station to finish a fresh noodle shift. Then drive to the marked stop at ${deliveryApproach.name || 'the Kingston public approach'}, come to a full stop, press E to step out and walk to the handover point. Once the copy is handed over, lose any police following you anywhere. Kit and Rowan cover the street.`,
      outro: 'Mara: The copies agree, but one sealed collection is still moving. Rowan will scout it before we act.',
      stages: [target(home, `Inside ${homeLocation}: walk to the case table and press Q to pack a fresh copy`, 'home-action', homeTask), target(map.spawn, 'Press E beside your car to board with the packed copy', 'drive', { anywhere: true }), target(bridgeCrossing, 'Drive the copy across Commonwealth Avenue Bridge to its marked north approach', 'drive', { radius: 45, hold: 0 }), target(noodle, `Inside ${noodle.name}: walk to the marked noodle station and press Q to finish the fresh shift`, 'work', { storeId: noodle.id, stationKind: 'noodle', hold: 0 }), target(deliveryApproach, `Drive to the marked stop at ${deliveryApproach.name || 'the Kingston public approach'} and come to a full stop`, 'drive', { stop: true }), target(deliveryApproach, 'Press E to step out and hand over the copy at the marker. Lose any police following you after the handover', 'escape', { arriveOnFoot: true, clear: true, radius: 22, requireWanted: false })] },
    { id: 'paper-trail-survey', character: 'corporate', name: '10. Paper trail survey', combat: false, contact: 'Mara', reward: 900, time: 900,
      cutscene: scene('paper-trail-survey', 'Look before the collection', ['Rowan', 'The ledger names a sealed depot case. We need its collection notice and a clear departure route.'], ['Mara', 'Scout The Book Moo from the public approach. Frame each marker steadily and take a fresh scan.']),
      briefing: 'Rowan, stand outside The Book Moo on foot. Frame the marked fictional collection notice in your view from 2 to 18 m away, hold the camera steady, then press I (or the SCAN button) for a fresh scan. Repeat the same framing and scan for the marked departure sightline. Driving past or waiting cannot document either subject.',
      outro: 'Rowan: The notice identifies the Coals collection case. The departure sightline is clear. Milo will check the handover route.',
      stages: [target(bookshop, 'Outside The Book Moo: frame the marked collection notice from 2 to 18 m, hold steady, then press I to scan', 'recon', { storeId: bookshop.id, targetId: 'bookmoo-collection-notice', subject: 'notice', hold: 0 }), target(bookshop, 'Outside The Book Moo: frame the marked departure sightline from 2 to 18 m, hold steady, then press I to scan', 'recon', { storeId: bookshop.id, targetId: 'bookmoo-departure', subject: 'departure', hold: 0 })] },
    { id: 'exit-interview', character: 'basement', name: '11. Exit interview', combat: false, contact: 'Jules', reward: 1000, time: 900,
      cutscene: scene('exit-interview', 'A route with a reason', ['Milo', 'No more arriving with a case and no way out. I am checking both ends first.'], ['Jules', 'Scan the safehouse public approach and the Kingston handover road on foot. Then Kit can take the sealed account.']),
      briefing: `Milo, stand on the marked public approach outside ${homeLocation} on foot. Frame the marked escape lane from 2 to 18 m away, hold the camera steady and press I for a fresh scan. Then walk (or drive and step out) to the marked Kingston handover road and scan that sightline the same way. These checks prepare the crew escape and handover.`,
      outro: 'Milo: The safehouse approach and handover lane are checked. Kit has a collection window and a way out.',
      stages: [target(homeApproach, 'Stand on the marked safehouse approach, frame the escape lane from 2 to 18 m, then press I to scan', 'recon', { targetId: 'safehouse-escape-lane', hold: 0 }), target(deliveryApproach, 'At the marked Kingston handover road, frame the sightline from 2 to 18 m, then press I to scan', 'recon', { targetId: 'kingston-handover-lane', hold: 0 })] },
    { id: 'sealed-account', character: 'student', name: '12. Sealed account', contact: 'Mara', reward: 2400, time: 1080,
      cutscene: scene('sealed-account', 'The prepared score', ['Kit', 'Rowan found the collection window. Milo checked the way out. We take the till and the sealed evidence case together.'], ['Mara', 'Complete the Coals till handover, secure the separate case inside, then lose the police.']),
      briefing: 'Kit, use the crew reconnaissance to intercept the depot collection at Coals. Drive to the marked stop, press E to step out and press E at the door to enter. Stand near the employee, aim your pistol to threaten them and press E to complete the fresh till handover. In the same room, walk to the marked evidence station and press Q to secure the separate sealed case. Walk out (E leaves) with the case and lose any police following you.',
      outro: 'Kit: The collection and its sealed evidence are out. Dot has called Rowan back to Lambzhou to settle the last dispute.',
      stages: [target(shop, 'Drive to the marked Coals stop, step out (E), enter (E), then threaten the employee and press E for the till handover', 'robbery', { storeId: shop.id, hold: 0 }), target(shop, 'Inside Coals: walk to the marked evidence station and press Q to secure the sealed case', 'evidence', { storeId: shop.id, stationKind: 'evidence', hold: 0 }), loseSearch(redHill, 'Walk out (E leaves) with the case and lose any police following you')] },
    { id: 'earmuffs-rematch', character: 'corporate', name: '13. Pink Earmuffs rematch', contact: 'Dot', reward: 1300, time: 900,
      cutscene: scene('earmuffs-rematch', 'Settle the booth dispute', ['Rowan', 'Dot in the pink earmuffs wants a rematch. This time I intend to finish the fight standing.'], ['Mara', 'Find her at the Lambzhou booth. Win the actual fight, then leave and choose how to handle the responding officer.']),
      briefing: 'Rowan, walk to the marked door of Lambzhou 1919 and press E to enter. Go to Dot in the pink earmuffs at the orange corner booth and press E to talk, then choose Fight. Dodge her thrown bowl, press F to punch her, and step back whenever she winds up a swing. This rematch is a real fight, so mind your health: two clean fist hits after the bowl are needed to win. When she stays down, walk out (E leaves) and lose any police following you. You can give a statement to the officer outside.',
      outro: 'Rowan: Dot is down. Mara has two collections left to move.',
      stages: [target(noodle, 'Lambzhou 1919: press E at the marked door, then press E at the booth to challenge Pink Earmuffs and win the real fight', 'fight', { storeId: noodle.id, victory: true, hold: 0 }), loseSearch(noodle, 'Walk out (E leaves) and lose any police following you', { aftermath: true })] },
    { id: 'closing-time', character: 'student', name: '14. Closing time', contact: 'Mara', reward: 2800, time: 1440,
      cutscene: scene('closing-time', 'Closing time', ['Mara', 'Both tills need fresh handovers. The sealed case is separate.'], ['Kit', 'Coals first. Then Scoot. We leave together.']),
      briefing: 'Kit, intercept two depot collections. Drive to the marked Coals stop, step out (E) and enter (E). Stand near the employee, aim your pistol to threaten them and press E for the fresh till handover, then walk to the marked evidence station and press Q to secure a fresh sealed case. Walk out (E leaves), drive to the marked Scoot Wholefoods stop and repeat the separate till handover inside. Then leave the shop and lose any police following you.',
      outro: 'Kit: Both collections and the sealed case are out. Rowan has the transfer route.',
      stages: [target(shop, 'Drive to the marked Coals stop, step out (E), enter (E), then threaten the employee and press E for the till handover', 'robbery', { storeId: shop.id, hold: 0 }), target(shop, 'Inside Coals: walk to the marked evidence station and press Q to secure a fresh case', 'evidence', { storeId: shop.id, stationKind: 'evidence', hold: 0 }), target(wholefoods, 'Walk out (E leaves), drive to the marked Scoot Wholefoods stop and come to a full stop', 'drive', { stop: true }), target(wholefoods, 'Inside Scoot Wholefoods: threaten the employee and press E for the separate till handover', 'robbery', { storeId: wholefoods.id, hold: 0 }), loseSearch(redHill, 'Walk out (E leaves) and lose any police following you')] },
    { id: 'terminal-transfer', character: 'corporate', name: '15. Terminal transfer', combat: false, contact: 'Jules', reward: 3400, time: 1440,
      cutscene: scene('terminal-transfer', 'Terminal transfer', ['Jules', 'Pack the transfer copy at Milo’s case table. The airport meeting is a public handover.'], ['Rowan', 'I used to send someone else with the paperwork. This copy travels with me.']),
      briefing: 'Rowan, enter Milo’s home (E at the door), press Q at the case table and complete a fresh packing task. Walk out, board your car and drive to the marked Commonwealth Avenue north approach and pass through it, then continue to the marked Canberra Airport public approach and come to a full stop. Press E to step out for the handover, then lose any police following you anywhere. Kit and Milo cover the crew.',
      outro: 'Rowan: The transfer copy is safe. It names Blackthorn and the Margin Parade procurement order. The money is not enough; we still need the original and a signed correction.',
      stages: [target(home, `Inside ${homeLocation}: press Q at the case table to pack the transfer copy`, 'home-action', homeTask), target(bridgeCrossing, 'Drive the packed transfer copy through the marked Commonwealth Avenue north approach', 'drive', { radius: 45, hold: 0 }), target(airportApproach, 'Drive to the marked Canberra Airport approach and come to a full stop', 'drive', { stop: true, radius: 40 }), target(airportApproach, 'Press E to step out at the public approach for the handover. Lose any police following you after the handover', 'escape', { arriveOnFoot: true, clear: true, radius: 22, requireWanted: false })] },
    { id: 'conflict-of-interest', character: 'corporate', name: '16. Conflict of interest', combat: false, contact: 'Mara', reward: 1800, time: 1080,
      cutscene: scene('conflict-of-interest', 'The signature on the order', ['Rowan', 'Margin Parade approved the depot charges. The transfer copy names Blackthorn, Adrian Voss’s collection crew. My signature is on the cover sheet.'], ['Mara', 'Scan the order notice at The Book Moo, then secure the matching Coals case. Bring evidence, not another collection.']),
      briefing: 'Rowan, stand outside The Book Moo on foot and frame the marked fictional procurement order notice from 2 to 18 m away, then press I (or SCAN) for a fresh scan. Press E at the Coals door to enter, walk to the marked evidence station and press Q to secure the matching case. Walk out (E leaves) with any search clear. Attacks are disabled during this audit.',
      outro: 'Rowan: The order and sealed case agree. Blackthorn routed the depot charges through Margin Parade. I am signing a correction instead of protecting my promotion.',
      stages: [target(bookshop, 'Outside The Book Moo: frame the marked order notice from 2 to 18 m, hold steady, then press I to scan', 'recon', { storeId: bookshop.id, targetId: 'bookmoo-procurement-order', subject: 'notice', hold: 0 }), target(shop, 'Inside Coals: walk to the marked evidence station and press Q to secure the matching case', 'evidence', { storeId: shop.id, stationKind: 'evidence', hold: 0 }), loseSearch(shop, 'Walk out of Coals (E leaves) and lose any police following you')] },
    { id: 'three-clean-copies', character: 'basement', name: '17. Three clean copies', combat: false, contact: 'Kit and Rowan', reward: 2000, time: 1080,
      cutscene: scene('three-clean-copies', 'Keep the receipt', ['Kit', 'My club gets its refund. Rowan signs the correction. Your debt gets cancelled, Milo. Three people need their own proof.'], ['Milo', 'I will pack the signed copies at home and take them to Mara in Kingston. No stolen car this time. We finish with a receipt for everyone.']),
      briefing: `Milo, press E at your front door to enter ${homeLocation}, then press Q at the case table to complete a fresh packing task for the three signed copies. Drive any usable (not stolen) car to the marked stop at ${deliveryApproach.name || 'the Kingston public approach'} and come to a full stop. Press E to step out and take the copies to Mara at the marker. After the handover, lose any police following you anywhere. Kit and Rowan come along. No theft or fighting is required.`,
      outro: 'Mara: Kit has the club refund record. Rowan has lodged the signed correction. Milo has the cancelled debt receipt. All three keep a copy; Blackthorn cannot erase this account by taking one case.',
      stages: [target(home, `Inside ${homeLocation}: walk to the case table and press Q to pack the three signed copies`, 'home-action', homeTask), target(deliveryApproach, `Drive the signed copies to the marked stop at ${deliveryApproach.name || 'the Kingston public approach'} and come to a full stop`, 'drive', { stop: true }), target(deliveryApproach, 'Press E to step out and bring the copies to Mara at the marker. Lose any police following you after the handover', 'escape', { arriveOnFoot: true, clear: true, radius: 22, requireWanted: false })] },
  ].map(chapter => ({ ...chapter, companions: crew(chapter.character), stages: chapter.stages.map(stage => ({
    ...stage, hold: ['foot', 'drive', 'escape', 'interior'].includes(stage.kind) ? 0 : stage.hold,
    ...(stage.kind === 'recon' ? { settleSeconds: .65 } : {}),
  })) })));
  const sharedIds = new Set(shared.map(chapter => chapter.id));
  const mall = { x: -248.655, z: -4172.87 };
  const characters = freeze([
    { id: 'student', name: 'Kit Vale', age: 18, tagline: 'A Telopea student with one last errand and very little patience.', appearance: 'student', start: { ...map.spawn }, onFoot: true },
    { id: 'corporate', name: 'Rowan Pike', age: 29, tagline: 'A Civic analyst whose career depends on a slideshow.', appearance: 'corporate', start: { ...mall }, onFoot: true },
    { id: 'basement', name: 'Milo Finch', age: 26, tagline: 'A basement regular trying a radical new strategy: going outside.', appearance: 'basement', start: { x: homeApproach.x, z: homeApproach.z }, onFoot: false },
  ]);
  const intros = freeze({
    student: [
      { id: 'student-paper-chase', name: 'False start', contact: 'Kit Vale', reward: 100, time: 480, combat: false,
        cutscene: scene('student-paper-chase', 'After hours', ['Kit', 'Our club saved for that equipment. The depot kept the refund and called it a delivery fee. I want the money and a record they cannot change.'], ['Kit', 'I am back after hours. Trigger the alarm, get outside and lose the search. No fighting.']),
        briefing: 'Your school club refund is stuck at the depot. Kit, walk to the marked door of the Telopea after-hours wing and press E to go inside. Follow the wall to the red alarm panel, stand beside it and press E to set it off as a diversion. Walk back out the same marked door (E leaves), then go anywhere to lose the police. Attacks are disabled during this mission.',
        outro: 'Kit: Clear of the search. The depot refund has a Coals stock reference. Mara can get me inside.',
        stages: [target(school, 'Telopea after-hours wing: press E at the marked door to enter, then press E at the red alarm panel', 'school-alarm', { roomId: schoolRoomId, hold: 0 }), loseSearch(school, 'Walk back out the marked door (E leaves), then lose the police anywhere', { requireWanted: true })] },
      { id: 'student-extra-credit', name: 'Extra credit', combat: false, cutscene: scene('student-extra-credit', 'The stock reference', ['Mara', 'That refund went through Coals. Work a real stock shift and find the depot receipt.'], ['Kit', 'A quiet shift first. Then we find where the money went.']), contact: 'Mara, local courier', reward: 150, time: 660,
        briefing: 'Mara traced the depot refund to a Coals stock order. Kit, drive to the marked Coals shop and come to a full stop outside. Press E at its street door to enter, walk to the marked stock station and press Q to work a real stock shift to the end. The depot receipt appears when the shift completes.',
        outro: 'Kit: Shift finished. Mara wants the depot receipt brought to Kingston.',
        stages: [target(shop, 'Drive to the marked Coals shop and come to a full stop outside', 'drive', { stop: true }), target(shop, 'Inside Coals: walk to the marked stock station and press Q to finish the stock shift', 'work', { storeId: shop.id, hold: 0 })] },
    ],
    corporate: [
      { id: 'corporate-present-tense', name: 'Present tense', combat: false, cutscene: scene('corporate-present-tense', 'Margin Parade', ['Jules', 'The board is downstairs. What does the green line on your depot slide mean?'], ['Rowan', 'It means they paid. Or we paid. It definitely means lunch if I can get through this.']), contact: 'Rowan Pike, analyst', reward: 100, time: 480,
        briefing: 'Margin Parade, your employer, has a crucial slideshow due. The Capitol Centre office is on Bunda Street: walk to its marked door and press E to go inside. Walk to the PowerPunt presentation station and press Q to start the presentation, which dies in an outage. Walk back out the marked door (E leaves) and step outside to end the mission. Attacks are disabled.',
        outro: 'Rowan: PowerPunt lost every slide. My manager called that an opportunity. I am taking lunch.',
        stages: [target(mall, 'Capitol Centre office on Bunda Street: press E at the marked door, then press Q at the PowerPunt station', 'presentation', { roomId: 'interior-canberra-centre', hold: 0 }), target(mall, 'Walk back out the marked office door (E leaves) and step outside after the outage', 'foot', { radius: 18, hold: 0 })] },
      { id: 'corporate-lunch-breakpoint', name: 'Lunch breakpoint', cutscene: scene('corporate-lunch-breakpoint', 'Out to lunch', ['Rowan', 'PowerPunt lost the slides. My manager called it an opportunity.'], ['Rowan', 'I need lunch and five minutes without office politics.']), contact: 'Rowan Pike', reward: 150, time: 540, advisoryTime: true,
        briefing: 'Lunch break, Rowan. Lambzhou 1919 is the noodle restaurant on Bunda Street: walk to its marked door and press E to go inside. Walk down the central aisle to the marked service counter and stand beside it until the booth objective appears. Then go to Dot at the orange corner booth at the back right and press E to talk. She throws her bowl and starts a fistfight: dodge it, press F to punch her, and step back whenever you see her winding up a swing. Her punches barely hurt you, one clean knockdown wins, and the mission clock never fails you, so take your time. When she stays down, walk back out (E leaves) and lose the police anywhere. You can give a statement to the officer outside.',
        outro: 'Rowan: A broken slideshow, thrown noodles and a fistfight. Lunch is over. Mara has work that leaves a receipt.',
        stages: [target(noodle, 'Lambzhou 1919 on Bunda Street: press E at the marked door, then stand beside the marked service counter until the booth objective appears', 'interior', { storeId: noodle.id || 'store-5656111023', radius: 2.5 }), target(noodle, 'Orange corner booth, back right: press E to talk to Dot, dodge her bowl, then press F to punch her down; step back when she winds up', 'encounter', { storeId: 'store-5656111023', victory: true, hold: 0 }), loseSearch(noodle, 'Walk out (E leaves) and lose the police anywhere', { aftermath: true })] },
    ],
    basement: [
      { id: 'basement-touch-grass', name: 'Touch grass', combat: false, cutscene: scene('basement-touch-grass', 'The overdue notice', ['Milo', 'The depot wants payment for parcels I never received. I need that false debt cancelled, not just enough cash to hide from the collector.'], ['Milo', `My saloon is ready. First, pack my case at ${homeLocation}, then drive to Coals for paid work.`]), contact: 'Milo Finch', reward: 100, time: 540,
        briefing: `Milo, start seated in your saloon near ${homeLocation}. Press E to step out of the car. Walk to the marked door of your home and press E to enter, then press Q at the case table to pack your case. Walk out through the same marked door (E leaves) and press E beside your saloon to get back in. Drive to the marked Coals shop and come to a full stop outside, press E to exit, press E at the shop door, then press Q at the stock station to complete a stock shift. Attacks are disabled during this job.`,
        outro: 'Milo: Actual work. Actual wages. Disturbingly effective.',
        stages: [target(home, `Inside ${homeLocation}: walk to the case table and press Q to pack your case`, 'home-action', homeTask), target(homeApproach, `Step outside ${homeLocation} through the same marked door (E leaves), then press E beside your car`, 'foot', { radius: 12, hold: 0 }), target(shop, 'Drive to the marked Coals shop and come to a full stop outside', 'drive', { stop: true }), target(shop, 'Inside Coals: walk to the marked stock station and press Q to complete the stock shift', 'work', { storeId: shop.id, hold: 0 })] },
      { id: 'basement-first-delivery', combat: false, name: 'Signed for', cutscene: scene('basement-first-delivery', 'A real receipt', ['Mara', 'One parcel, one signature. Keep the receipt this time.'], ['Milo', 'If the depot tries charging twice, I want proof.']), contact: 'Mara, local courier', reward: 150, time: 600,
        briefing: `Milo, collect the sealed parcel through a paid Coals stock shift: press E at the shop door, then Q at the stock station and finish the shift. Walk out through the same door (E leaves). Press E beside your car to get in, drive to the marked approach at ${deliveryApproach.name || 'Kingston'} and come to a full stop before the handover. Press E to step out, then walk to Mara to deliver the parcel on foot.`,
        outro: 'Milo: The parcel has the same depot code as two other receipts. Mara wants all three people together.',
        stages: [target(shop, 'Inside Coals: press Q at the stock station and finish the parcel preparation shift', 'work', { storeId: shop.id, hold: 0 }), target(deliveryApproach, `Press E beside your car, drive to ${deliveryApproach.name || 'the Kingston meeting approach'} and come to a full stop`, 'drive', { stop: true }), target(deliveryApproach, 'Press E to step out, then walk to Mara to hand over the sealed parcel', 'foot', { radius: 16, hold: 0 })] },
    ],
  });
  const meeting = freeze({ id: 'three-receipts', name: 'Three receipts', cutscene: scene('three-receipts', 'One fraudulent depot', ['Kit', 'Two strangers want to meet me about a missing refund. You have actually met them, right?'], ['Mara', 'One signed the order. One got the bill. Bring what the club got. I’ll be at Kingston.']), contact: 'Kit, Rowan, Milo and Mara', reward: 200, time: 600,
    briefing: 'Meet the others on foot at the marked Kingston approach to compare all three receipts. Drive the originals to Mara on the Crescent, or open Campaign (J) after the meeting and choose to keep a backup. For the backup, park by Milo’s house, go inside and pack the copies at his case table.',
    outro: 'Mara: Three people, one fraudulent depot. We take back the money together. Meet on the Crescent for the interception.',
    stages: [target(meetingPoint || kingston, 'Walk to the marked Kingston public approach to bring the three receipts together', 'foot', { radius: 16, hold: 0 }), target(map.spawn, 'Drive to Mara on the Crescent and stop. Open Campaign (J) to choose the safehouse backup instead.', 'drive', { stop: true })] });
  const meetingBackup = freeze({...meeting,
    stages:[meeting.stages[0],
      target(homeApproach, `Drive to the marked stop outside ${homeLocation}. Open Campaign (J) to switch to Mara’s handover.`, 'drive', {stop:true}),
      target(home, `Enter ${homeLocation} and complete a fresh packing task at the case table (Q) to keep the crew’s copies.`, 'home-action', homeTask)],
    outro:'Mara: Three signed copies, three witnesses. If the depot wants to deny a refund now, it has to deny all of you.'});
  const ids = characters.map(c => c.id);
  const aviation = { id: 'above-the-paperwork', name: 'Optional: Above the paperwork', contact: 'Jules', reward: 1800, time: 1800, aviation: true, optional: true, combat: true,
    briefing: 'Jules needs an aerial copy of the depot route. Walk to the marked helicopter at Canberra Airport and press E to bypass its lock and climb in. Hold Space to climb above 15 m. Come back down beside the marked jets, land to a full stop and press E to step out, then press E at a jet to board. Hold Space to climb above 20 m and the second copy is sent. This optional flight leaves the main story order unchanged.',
    outro: 'Jules: Two flight records, one paper trail. The evidence is safely copied.',
    stages: [target(airport, 'Walk to the marked helicopter and press E to bypass its lock and climb in', 'aviation', { aircraftKind: 'helicopter', anywhere: true }), target(airport, 'In the helicopter: hold Space to climb above 15 m', 'aviation', { aircraftKind: 'helicopter', minimumAltitude: 15, airborne: true, anywhere: true }), target(airport, 'Land beside the marked jets, stop fully and press E to step out', 'foot', { radius: 120, hold: 1 }), target(airport, 'Press E at the marked jet, hold W for runway speed, then hold Space to climb above 20 m', 'aviation', { aircraftKind: 'jet', minimumAltitude: 20, airborne: true, anywhere: true })] };
  const contracts = stealthContracts?.chapters ?? [];
  const assassination = assassinationMission?.id === ASSASSINATION_MISSION_ID && assassinationMission.assassination === true &&
    Array.isArray(assassinationMission.stages) && assassinationMission.stages.length === 3 ? assassinationMission : null;
  const optional = freeze([aviation, ...contracts, ...(assassination ? [assassination] : [])]);
  const optionalIds = new Set([aviation.id, ...STEALTH_CONTRACT_IDS, ASSASSINATION_MISSION_ID]);
  const planChoices = choices => choices.map(({ id, name, description }) => ({ id, name, description }));
  const contractOptions = new Map(contracts.map(chapter => [chapter.id, freeze({
    approaches: planChoices(chapter.approaches), exits: planChoices(chapter.exits),
  })]));
  let optionalChapter = null;
  const developerEntries = [
    ...ids.flatMap(character => intros[character].map(chapter => ({ chapter, character }))),
    { chapter: meeting, character: 'student' },
    ...shared.map(chapter => ({ chapter, character: chapter.character })),
  ];
  const developerList = freeze(developerEntries.map(({ chapter, character }) => ({
    id: chapter.id, name: chapter.name, character,
    start: clone(characters.find(hero => hero.id === character).start),
    target: clone(chapter.stages[0]),
  })));
  let developerChapter = null;
  const emptyIntros = () => Object.fromEntries(ids.map(id => [id, []]));
  const state = { character: null, intros: emptyIntros(), meeting: false, legacy: false, completed: [], optionalCompleted: [], active: null, message: 'Choose a character to begin.', failed: false };
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const keys = (value, allowed) => object(value) && Object.keys(value).length === allowed.length && Object.keys(value).every(k => allowed.includes(k));
  const prefix = (value, chapters) => Array.isArray(value) && value.length <= chapters.length && value.every((id, index) => chapters[index]?.id === id);
  if (saved !== null) {
    if (keys(saved, ['version', 'completed']) && saved.version === 1 && prefix(saved.completed, shared)) {
      state.character = 'legacy'; state.legacy = true; state.completed = [...saved.completed];
    } else {
      if (!(keys(saved, ['version', 'character', 'intros', 'meeting', 'legacy', 'completed']) || keys(saved, ['version', 'character', 'intros', 'meeting', 'legacy', 'completed', 'optionalCompleted'])) || saved.version !== 2 ||
          (saved.optionalCompleted!==undefined&&(!Array.isArray(saved.optionalCompleted)||new Set(saved.optionalCompleted).size!==saved.optionalCompleted.length||saved.optionalCompleted.some(id=>!optionalIds.has(id)))) ||
          ![null, 'legacy', ...ids].includes(saved.character) || typeof saved.meeting !== 'boolean' || typeof saved.legacy !== 'boolean' ||
          !keys(saved.intros, ids) || ids.some(id => !prefix(saved.intros[id], intros[id])) || !prefix(saved.completed, shared) ||
          (saved.character === 'legacy' && !saved.legacy) || (saved.character === null && (saved.legacy || saved.meeting || saved.completed.length || saved.optionalCompleted?.length || ids.some(id => saved.intros[id].length))) ||
          (saved.meeting && ids.some(id => saved.intros[id].length !== intros[id].length)) ||
          (saved.completed.length && !saved.legacy && !saved.meeting)) throw new Error('Unsupported or corrupt campaign progress.');
      state.character = saved.character; state.intros = clone(saved.intros); state.meeting = saved.meeting; state.legacy = saved.legacy; state.completed = [...saved.completed];
      state.optionalCompleted = [...(saved.optionalCompleted || [])];
    }
  }
  const events = [];
  const retrySnapshots = new WeakMap(), retryTokens = new Map();
  let attemptGeneration = 0, failedGeneration = null, failedRespawn = 0;
  const retryProgress = () => JSON.stringify([state.intros,state.meeting,state.legacy,state.completed,state.optionalCompleted]);
  function retireRetries() { attemptGeneration++; failedGeneration = null; retryTokens.clear(); }

  const allIntroduced = () => ids.every(id => state.intros[id].length === intros[id].length);
  const optionalUnlocked = () => state.completed.length === shared.length && (state.legacy || (allIntroduced() && state.meeting));
  const current = () => {
    if (optionalChapter) return optionalChapter;
    if (developerChapter) return developerChapter;
    if (state.active) {
      if (state.active.id === meeting.id && state.active.meetingRoute === 'backup') return meetingBackup;
      const chapter = shared.find(chapter => chapter.id === state.active.id);
      if (chapter) return chapter;
    }
    if (!state.character) return null;
    if (state.character === 'legacy') return shared[state.completed.length] || null;
    const opening = intros[state.character][state.intros[state.character].length];
    if (opening) return opening;
    if (!allIntroduced()) return null;
    if (!state.meeting) return meeting;
    const chapter = shared[state.completed.length];
    return chapter?.character === state.character ? chapter : null;
  };
  const chapters = () => state.character === 'legacy' ? shared : [...(intros[state.character] || []), meeting, ...shared.filter(chapter => chapter.character === state.character)];
  const nextRequiredCharacter = () => {
    if (state.active) return null;
    if (state.character === 'legacy' || !allIntroduced() || !state.meeting) return null;
    const chapter = shared[state.completed.length];
    return chapter && chapter.character !== state.character ? characters.find(hero => hero.id === chapter.character) : null;
  };
  const requiredMessage = () => {
    const hero = nextRequiredCharacter();
    return hero ? `Switch to ${hero.name} for ${shared[state.completed.length].name}.` : null;
  };
  const isCompleted = id => state.completed.includes(id) || state.optionalCompleted.includes(id) || (id === meeting.id && state.meeting) || ids.some(hero => state.intros[hero].includes(id));
  function policeSearchDuration(wanted) {
    const active = state.active;
    if (wanted === 1 && active?.id === 'corporate-lunch-breakpoint' && active.target.kind === 'escape') return 12;
    if (sharedIds.has(active?.id) || active?.assassination) return SHARED_SEARCH_DURATION[wanted] || undefined;
    return undefined;
  }
  const isStoryRobbery = id => sharedIds.has(state.active?.id) && state.active.target.kind === 'robbery' && state.active.target.storeId === id;
  function validContext(ctx) {
    return ctx && finitePoint(ctx.pose) && typeof ctx.onFoot === 'boolean' && Number.isSafeInteger(ctx.respawnSerial) && Number.isFinite(ctx.wanted) && ctx.wanted >= 0 && ctx.wanted <= 5;
  }
  function canSelectCharacter(id) {
    return ids.includes(id) && !state.active;
  }
  function selectCharacter(id, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign) return { ok: false, message: 'Campaign unavailable here.' };
    if (!ids.includes(id)) return { ok: false, message: 'Choose an available character.' };
    if (!canSelectCharacter(id)) return { ok: false, message: 'Finish or cancel the active mission before switching characters.' };
    retireRetries();
    state.character = id; state.failed = false; state.message = `${characters.find(c => c.id === id).name}: ${current()?.briefing || requiredMessage() || (allIntroduced() && state.meeting ? 'Campaign complete.' : 'Choose another character to bring the three stories together.')}`;
    return { ok: true, message: state.message };
  }
  function companionSwitchReason(id, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.campaign !== true) return 'Campaign unavailable here.';
    const active = state.active, chapter = shared.find(chapter => chapter.id === active?.id);
    if (!chapter || active.developer || !ids.includes(state.character)) return 'Switch allies during a shared crew mission.';
    const goal = chapter.stages[active.stage];
    if (!goal || !['foot', 'drive', 'escape'].includes(goal.kind) || active.target.kind !== goal.kind) return 'Finish this mission action before switching allies.';
    if (ctx.recovering || !Number.isFinite(ctx.health) || ctx.health <= 0 || ctx.respawnSerial !== active.serial || ctx.impactTime > 0) return 'Recover before switching allies.';
    if (ctx.interior || ctx.passenger || ctx.carjacking || ctx.activeJob || ctx.activity || ctx.cutscene || ctx.heistActive || ctx.homeActionActive) return 'Finish the current action before switching allies.';
    if (!ids.includes(id) || id === state.character || !active.companions.includes(id)) return 'Choose an ally in the current crew.';
    const ally = ctx.companion;
    if (!ally || ally.id !== `campaign-ally:${id}` || ally.appearanceId !== `player:${id}` || !finitePoint(ally) || !Number.isFinite(ally.yaw) || ally.active !== true || !Number.isFinite(ally.health) || ally.health <= 0) return 'That ally is unavailable.';
    if (ally.seated || ally.mode === 'passenger') return 'Let that ally leave the vehicle before switching.';
    return '';
  }
  function canSwitchCompanion(id, ctx) { return companionSwitchReason(id, ctx) === ''; }
  function switchCompanion(id, ctx) {
    const reason = companionSwitchReason(id, ctx);
    if (reason) return { ok: false, message: reason };
    if (ctx.switchSafe !== true) return { ok: false, message: 'A clear crew handover is required.' };
    const previous = state.character, index = state.active.companions.indexOf(id);
    state.active.companions[index] = previous;
    state.character = id;
    return { ok: true, message: `Now controlling ${characters.find(hero => hero.id === id).name}.` };
  }
  const serial = value => Number.isSafeInteger(value?.serial) && value.serial >= 0 ? value.serial : 0;
  const baselines = (ctx, previous = {}) => Object.fromEntries(Object.entries({ recon: serial(ctx.recon), evidence: serial(ctx.evidence), presentation: serial(ctx.presentation), encounter: serial(ctx.encounter), work: serial(ctx.workCompletion), schoolAlarm: serial(ctx.schoolAlarm), heist: serial(ctx.heist), homeAction: serial(ctx.homeAction), assassination: serial(ctx.assassinationOutcome) }).map(([kind, value]) => [kind, Math.max(value, previous[kind] || 0)]));
  function start(ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign) return { ok: false, message: 'Campaign unavailable here.' };
    if (state.active) return { ok: false, message: 'Mission already active.' };
    const chapter = current();
    if (!chapter) return { ok: false, message: !state.character ? 'Choose a character first.' : requiredMessage() || (!allIntroduced() && state.character !== 'legacy' ? 'Choose another character to complete their introduction.' : 'Campaign complete.') };
    return begin(chapter, ctx);
  }
  function chooseMeetingRoute(route, ctx) {
    const active=state.active;
    if (!validContext(ctx) || ctx.campaign!==true || ctx.sandbox || ctx.recovering || ctx.respawnSerial!==active?.serial ||
        active?.id!==meeting.id || active.stage!==1 || active.developer || !['direct','backup'].includes(route))
      return {ok:false,message:'Choose a handover after meeting the crew in Kingston.'};
    if ((active.meetingRoute || 'direct')===route) return {ok:false,message:'That handover is already marked.'};
    const chapter=route==='backup'?meetingBackup:meeting;
    active.meetingRoute=route;
    active.target=clone(chapter.stages[active.stage]);active.stageCount=chapter.stages.length;
    active.held=0;active.escapeReached=false;active.prompt=objectivePrompt(active,ctx);
    return {ok:true,message:route==='backup'?'Milo’s case table is marked on the map.':'Mara’s Crescent handover is marked on the map.'};
  }
  function begin(chapter, ctx, developer = false) {
    retireRetries();
    state.active = { id: chapter.id, name: chapter.name, reward: developer ? 0 : chapter.reward, combat: chapter.combat !== false, companions: clone(chapter.companions || []), cutscene: chapter.cutscene ? clone(chapter.cutscene) : null, stage: 0, target: clone(chapter.stages[0]), remaining: chapter.time, elapsed: 0, held: 0, escapeReached: false, serial: ctx.respawnSerial, sawWanted: ctx.wanted > 0, baselines: baselines(ctx), advisoryTime: chapter.advisoryTime === true, ...(developer ? { developer: true, character: chapter.character } : { startCharacter: state.character }) };
    state.failed = false; state.message = chapter.briefing;
    state.active.stageCount = chapter.stages.length;
    if(chapter.optional)state.active.optional=true;
    if(chapter.aviation)state.active.aviation=true;
    if(chapter.assassination){
      state.active.assassination=true;
      state.active.assassinationSite=chapter.compound?.stealth??null;
    }
    if(chapter.stealth&&!chapter.assassination){
      state.active.stealth=true;state.active.stealthPlan=clone(chapter.stealthPlan);
      state.active.stealthSerial=serial(ctx.stealthOutcome);
    }
    state.active.prompt = objectivePrompt(state.active, ctx);
    events.push({ type: 'started', id: chapter.id, incident: Boolean(chapter.incident), wantedLevel: chapter.wantedLevel || 0 });
    return { ok: true, message: chapter.name };
  }
  function startOptional(id, ctx, plan) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.campaign || !state.character || state.active || ctx.aircraft || ctx.passenger) return { ok: false, message: 'Choose a character and finish the current action before this optional chapter.' };
    if (!optionalUnlocked()) return { ok: false, message: 'Finish the main story to unlock optional missions.' };
    const chapter = optional.find(chapter=>chapter.id===id);
    if(!chapter||isCompleted(id))return {ok:false,message:'This optional chapter is unavailable or already complete.'};
    if (chapter.assassination) { optionalChapter = chapter; return begin(chapter, ctx); }
    if(chapter.stealth){
      const planned=planStealthChapter(chapter,plan);
      if(!planned)return {ok:false,message:'Choose an available approach and exit.'};
      optionalChapter=planned;
      return begin(planned,ctx);
    }
    const locations=(Array.isArray(ctx.aircraftLocations)?ctx.aircraftLocations:[]).filter(point=>finitePoint(point)&&typeof point.id==='string'&&point.id&&!point.wrecked);
    const helicopter=locations.find(point=>point.kind==='helicopter');
    const jet=locations.filter(point=>point.kind==='jet').sort((a,b)=>distance(a,helicopter||airport)-distance(b,helicopter||airport))[0];
    if(!helicopter||!jet)return {ok:false,message:'This flight needs an available helicopter and jet. Return after the aircraft are ready.'};
    optionalChapter=clone(chapter);
    optionalChapter.stages.forEach((goal,index)=>{const point=index<2?helicopter:jet;goal.x=point.x;goal.z=point.z;if(goal.kind==='aviation')goal.aircraftId=point.id;});
    optionalChapter=freeze(optionalChapter);
    return begin(optionalChapter,ctx);
  }
  function startDeveloper(id, ctx) {
    if (ctx?.developer !== true || !validContext(ctx) || ctx.respawnSerial < 0 || ctx.sandbox || ctx.recovering || ctx.campaign !== true) return { ok: false, message: 'Mission preview unavailable here.' };
    if (state.active) return { ok: false, message: 'Finish or cancel the active mission first.' };
    const entry = developerEntries.find(item => item.chapter.id === id);
    if (!entry) return { ok: false, message: 'Choose an available mission.' };
    developerChapter = freeze({ ...entry.chapter, character: entry.character });
    return begin(developerChapter, ctx, true);
  }
  function captureRetry() {
    const active = state.active, chapter = current();
    if (!active || active.developer || !chapter || isCompleted(active.id)) return null;
    const token = Object.freeze({ id: active.id, stage: active.stage });
    retrySnapshots.set(token, { generation: attemptGeneration, progress: retryProgress(),
      chapter: freeze(clone(chapter)), active: clone(active), hero: state.character });
    retryTokens.set(active.stage, token);
    return token;
  }
  function resumeRetry(token, ctx) {
    const snapshot = token && typeof token === 'object' ? retrySnapshots.get(token) : null;
    if (!snapshot || snapshot.generation !== attemptGeneration || failedGeneration !== attemptGeneration ||
        retryTokens.get(token.stage) !== token || state.active || !state.failed || isCompleted(token.id) ||
        snapshot.progress !== retryProgress() || !validContext(ctx) || ctx.respawnSerial < failedRespawn ||
        ctx.sandbox || ctx.recovering || !ctx.campaign) return { ok: false, message: 'Mission retry unavailable.' };
    const active = clone(snapshot.active);
    active.serial = ctx.respawnSerial; active.held = 0; active.escapeReached = false;
    active.baselines = baselines(ctx, active.baselines);
    if (active.stealth) active.stealthSerial = Math.max(active.stealthSerial,serial(ctx.stealthOutcome));
    state.character = snapshot.hero; state.active = active; state.failed = false;
    state.message = active.target.label; failedGeneration = null;
    optionalChapter = active.optional ? snapshot.chapter : null;
    developerChapter = null;
    for (const stage of retryTokens.keys()) if (stage > active.stage) retryTokens.delete(stage);
    return { ok: true, message: active.target.label };
  }
  function fail(message, respawnSerial = state.active?.serial) {
    if (!state.active) return false;
    const { id, stage, serial: activeSerial } = state.active;
    failedGeneration = state.active.developer ? null : attemptGeneration;
    failedRespawn = Math.max(activeSerial,Number.isSafeInteger(respawnSerial) ? respawnSerial : activeSerial);
    if (!state.active.developer) state.character = state.active.startCharacter;
    state.active = null; developerChapter = null; optionalChapter = null; state.failed = true; state.message = message;
    events.push({ type: 'failed', id, stage, message }); return true;
  }
  const chapterPurpose = {
    'student-paper-chase': 'The club deserves a record it can keep.',
    'student-extra-credit': 'One shift. One receipt for the club.',
    'corporate-present-tense': 'I signed the account. I should check it.',
    'corporate-lunch-breakpoint': 'I wanted lunch, not another office dispute.',
    'basement-touch-grass': 'Outside, employed, still keeping the receipt.',
    'basement-first-delivery': 'Prepare it, deliver it, get the signature.',
    'three-receipts': 'Three receipts share one order reference.',
    'late-parcel': 'That debt is not mine. The paper trail matters.',
    'under-the-awning': 'The club refund has to stay on record.',
    'borrowed-wheels': 'Match the fleet entry to the account.',
    'quiet-streets': 'The ledger means nothing if we split up.',
    'across-the-water': 'Get the evidence to the other side.',
    'home-by-the-lake': 'A safe copy beats a good memory.',
    'shelf-life': 'Two real shifts. Compare both orders.',
    'two-till-problem': 'One entry alone cannot explain both charges.',
    'carbon-copy': 'The original stays home. This copy travels.',
    'paper-trail-survey': 'Document the fictional notice, not a guess.',
    'exit-interview': 'Finish both marked checks before the handover.',
    'sealed-account': 'The separate case must match the ledger.',
    'earmuffs-rematch': 'Dot remembers lunch. So do I.',
    'closing-time': 'Keep the case and the two entries together.',
    'terminal-transfer': 'This time I carry the paperwork myself.',
    'conflict-of-interest': 'My signature belongs on the correction.',
    'three-clean-copies': 'A refund, a correction, a cancelled debt. Three copies.',
  };
  const heroNames = { student: 'Kit', corporate: 'Rowan', basement: 'Milo' };
  function objectivePrompt(active, ctx) {
    const goal = active.target;
    const speaker = heroNames[active.character || state.character] || 'Crew';
    const purpose = chapterPurpose[active.id] || 'Finish the marked objective.';
    let next = goal.label;
    const atGoal = goal.anywhere || distance(ctx.pose, goal) <= goal.radius;
    if (goal.kind === 'escape' && active.escapeReached && ctx.wanted > 0) next = 'Lose the police anywhere.';
    else if (goal.clear && goal.kind !== 'escape' && atGoal && ctx.wanted > 0) next = 'This handover needs the current search resolved before it can finish.';
    else if (goal.kind === 'drive' && ctx.onFoot) next = 'Press E beside your car to board, then follow the marker.';
    else if (atGoal && goal.stop && !ctx.onFoot && !isVehicleStopped(ctx.pose, PARKING_MAX_SPEED)) next = 'Come to a full stop at the marked approach.';
    else if (['work', 'home-action', 'evidence', 'presentation'].includes(goal.kind) && !ctx.interior) next = `${goal.label} Enter through the marked door with E.`;
    else if (goal.kind === 'foot' && !ctx.onFoot) next = 'Stop safely, press E to step out, then walk to the marker.';
    else if (goal.kind === 'foot' && ctx.interior) next = 'Press E at the marked exit, then walk to the outdoor marker.';
    return `${speaker}: ${purpose} ${next}`;
  }
  function update(dt, ctx) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Campaign dt must be finite and nonnegative.');
    const active = state.active;
    if (!active || !validContext(ctx) || ctx.sandbox || !ctx.campaign || ctx.paused || dt === 0) return;
    if (ctx.respawnSerial !== active.serial || ctx.recovering) { fail(active.developer ? 'Mission preview failed.' : 'Mission failed.',ctx.respawnSerial); return; }
    if (ctx.health !== undefined && (!Number.isFinite(ctx.health) || ctx.health <= 0)) return;
    const step = Math.min(dt, .1), chapter = current(), goal = active.target;
    active.remaining = Math.max(0, active.remaining - step); active.elapsed += step; active.sawWanted ||= ctx.wanted > 0;
    if (!active.remaining && !active.advisoryTime) { fail(active.developer ? 'Mission preview time expired.' : 'Mission time expired.'); return; }
    active.prompt = objectivePrompt(active, ctx);
    let eligible = goal.anywhere || distance(ctx.pose, goal) <= goal.radius;
    if (active.assassination && goal.kind === 'foot' && goal.approaches) {
      eligible ||= Object.values(goal.approaches).some(entry => distance(ctx.pose, entry) <= goal.radius);
    }
    const parked = !goal.stop || (!ctx.passenger && !ctx.interior && isVehicleStopped(ctx.pose, PARKING_MAX_SPEED));
    if (goal.kind === 'aviation') eligible = !ctx.interior && ctx.aircraft?.id===goal.aircraftId && ctx.aircraft?.kind===goal.aircraftKind && ctx.aircraft.wrecked===false && (!goal.airborne||ctx.aircraft.airborne===true) && Number.isFinite(ctx.aircraft.altitude) && ctx.aircraft.altitude >= (goal.minimumAltitude||0);
    else if (goal.kind === 'stealth-contract') {
      const receipt = ctx.stealthOutcome;
      const roomId = goal.roomId ?? null;
      const matchingSpace = roomId ? ctx.interior?.roomId===roomId : !ctx.interior;
      eligible &&= active.stealth && ctx.onFoot && matchingSpace && !ctx.passenger && !ctx.aircraft && ctx.wanted===0 &&
        receipt?.id===active.id && (receipt.roomId??null)===roomId && receipt.stage===active.stage && serial(receipt)>active.stealthSerial;
    }
    else if (goal.kind === 'assassination') {
      const receipt = ctx.assassinationOutcome;
      eligible &&= active.assassination === true && ctx.onFoot === true && !ctx.interior && !ctx.passenger && !ctx.aircraft &&
        receipt?.missionId === active.id && receipt.targetId === goal.targetId && receipt.outcome === 'killed' &&
        serial(receipt) > active.baselines.assassination;
    }
    else if (goal.kind === 'interior') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.interior?.atCounter === true;
    else if (goal.kind === 'home-action') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.homeAction?.roomId === goal.roomId && ctx.homeAction?.outcome === 'packed' && serial(ctx.homeAction) > active.baselines.homeAction;
    else if (goal.kind === 'school-alarm') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.schoolAlarm?.roomId === goal.roomId && ctx.schoolAlarm?.outcome === 'triggered' && serial(ctx.schoolAlarm) > active.baselines.schoolAlarm;
    else if (goal.kind === 'robbery') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.heist?.storeId === goal.storeId && ctx.heist?.kind === 'robbery' && serial(ctx.heist) > active.baselines.heist;
    else if (goal.kind === 'presentation') eligible = ctx.onFoot && ctx.interior?.roomId === goal.roomId && ctx.presentation?.roomId === goal.roomId && ctx.presentation?.outcome === 'outage' && serial(ctx.presentation) > active.baselines.presentation;
    else if (goal.kind === 'encounter') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.encounter?.storeId === goal.storeId && ctx.encounter?.roomId === ctx.interior?.roomId && ctx.encounter?.character === 'booth-guest' && ctx.encounter?.phase === 'complete' && (goal.victory === true ? ctx.encounter?.outcome === 'noodle-victory' && ctx.encounter?.victory === true && ctx.encounter?.missionId === active.id : ctx.encounter?.outcome === 'noodle-fight') && serial(ctx.encounter) > active.baselines.encounter;
    else if (goal.kind === 'recon') eligible = ctx.onFoot && !ctx.interior && ctx.recon?.kind === 'recon' && ctx.recon?.outcome === 'documented' && ctx.recon?.missionId === active.id && ctx.recon?.stage === active.stage && ctx.recon?.targetId === goal.targetId && ctx.recon?.space === null && serial(ctx.recon) > active.baselines.recon;
    else if (goal.kind === 'evidence') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.evidence?.storeId === goal.storeId && ctx.evidence?.roomId === ctx.interior?.roomId && ctx.evidence?.missionId === active.id && ctx.evidence?.outcome === 'secured' && serial(ctx.evidence) > active.baselines.evidence;
    else if (goal.kind === 'fight') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.encounter?.storeId === goal.storeId && ctx.encounter?.roomId === ctx.interior?.roomId && ctx.encounter?.missionId === active.id && ctx.encounter?.character === 'booth-guest' && ctx.encounter?.phase === 'complete' && ctx.encounter?.outcome === 'noodle-victory' && ctx.encounter?.victory === true && serial(ctx.encounter) > active.baselines.encounter;
    else if (goal.kind === 'work') eligible = ctx.onFoot && ctx.interior?.storeId === goal.storeId && ctx.workCompletion?.storeId === goal.storeId && serial(ctx.workCompletion) > active.baselines.work;
    else if (goal.kind === 'foot') eligible &&= ctx.onFoot && !ctx.interior && (!active.aviation || !ctx.aircraft);
    else if (goal.kind === 'stolen') eligible &&= !ctx.onFoot && !ctx.interior && !ctx.passenger && !ctx.aircraft && ctx.vehicleHealth > 0 && ctx.vehicle?.stolen === true;
    else if (goal.kind === 'escape') {
      // Check any physical handover or getaway vehicle once. From there the
      // search can end anywhere, even after the player changes vehicles.
      if (eligible && !ctx.interior && (!(goal.foot || goal.arriveOnFoot) || ctx.onFoot) &&
          (!goal.drive || (!ctx.onFoot && !ctx.passenger && !ctx.aircraft && ctx.vehicleHealth > 0)) &&
          (!goal.stolen || ctx.vehicle?.stolen === true) && parked) active.escapeReached = true;
      // Departure objectives may already be clear; authored pursuits still need a real search.
      eligible = active.escapeReached && (goal.requireWanted === false || active.sawWanted) && ctx.wanted === 0;
    }
    else eligible &&= !ctx.onFoot && ctx.vehicleHealth > 0;
    if (goal.foot) eligible &&= ctx.onFoot && !ctx.interior;
    if (goal.kind !== 'escape') eligible &&= parked;
    if (goal.stolen && goal.kind !== 'escape') eligible &&= ctx.vehicle?.stolen === true;
    if (goal.clear) eligible &&= ctx.wanted === 0;
    active.held = eligible ? active.held + step : 0;
    if (!eligible || active.held + 1e-9 < (goal.hold ?? 0) || active.elapsed < .5) return;
    if (active.stage + 1 < chapter.stages.length) {
      if(active.stealth)active.stealthSerial=Math.max(active.stealthSerial,serial(ctx.stealthOutcome));
      active.stage++; active.target = clone(chapter.stages[active.stage]); active.held = 0; active.escapeReached = false; active.baselines = baselines(ctx, active.baselines);
      active.prompt = objectivePrompt(active, ctx);
      events.push({ type: 'stage', message: active.prompt });
    } else {
      if (developerChapter) {
        retireRetries();
        state.active = null; developerChapter = null; state.message = chapter.outro; state.failed = false;
        events.push({ type: 'developer-complete', id: chapter.id, reward: 0, message: chapter.outro });
        return;
      }
      if (ids.includes(state.character) && intros[state.character].some(item => item.id === chapter.id)) state.intros[state.character].push(chapter.id);
      else if (chapter.id === meeting.id) state.meeting = true;
      else if(chapter.optional)state.optionalCompleted.push(chapter.id);
      else state.completed.push(chapter.id);
      retireRetries();
      state.active = null; optionalChapter = null; state.message = chapter.outro; state.failed = false;
      events.push({ type: 'complete', id: chapter.id, reward: chapter.reward, message: chapter.outro });
    }
  }
  return { state, characters, get chapters() { return chapters(); }, optionalChapters: optional, optionalUnlocked, chooseMeetingRoute, contractPlans: id=>optionalUnlocked()?(contractOptions.get(id)??null):null, current, nextRequiredCharacter, start, startOptional, startDeveloper, captureRetry, resumeRetry, developerChapters: () => developerList, update, selectCharacter, canSelectCharacter, companionSwitchReason, canSwitchCompanion, switchCompanion, isCompleted, policeSearchDuration, isStoryRobbery,
    cancel: () => fail('Mission cancelled.'),
    serialize: () => clone({ version: 2, character: state.character, intros: state.intros, meeting: state.meeting, legacy: state.legacy, completed: state.completed, ...(state.optionalCompleted.length?{optionalCompleted:state.optionalCompleted}:{}) }),
    journal: () => freeze(clone({ character: state.character, introductions: ids.map(id => ({ character: id, chapters: intros[id].map(item => ({ id: item.id, name: item.name, complete: isCompleted(item.id) })) })), meeting: state.meeting, shared: shared.map(item => ({ id: item.id, character: item.character, name: item.name, complete: isCompleted(item.id) })) })),
    snapshot: () => freeze(clone({ ...state, next: current()?.id || null, switching: ids.filter(canSelectCharacter) })), drainEvents: () => events.splice(0) };
}
