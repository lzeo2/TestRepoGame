// Authored meters and pure navigation. The world adapter owns encounters and saves.
const RADIUS = 0.35;
const EPSILON = 1e-8;
const BOUNDS = { minX: -80, maxX: 80, minZ: -80, maxZ: 80 };
const COLORS = { cream: '#eee9d8', sage: '#88977b', blue: '#688ba0', clay: '#b98369', amber: '#d8bd83', path: '#d8ccb0' };

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const REGION_DEFINITIONS = freeze([
  { id: 0, name: 'Rootfold Meadow', element: 'Loamveil', description: 'A village trail follows the river into Loamveil woodland. Two bridges connect the western road post. Maren waits in the northern clearing.' },
  { id: 1, name: 'Stillwater Reach', element: 'Rillune', description: 'Rillune channels separate reed banks and sandy nesting grounds. The ferry outpost keeps both crossings open. Sola trains where the northern channel bends.' },
  { id: 2, name: 'Emberstep Quarry', element: 'Cindrel', description: 'Cindrel clay shelves surround a working quarry outpost. Trails skirt closed terraces and lead to the kiln road post. Neri practices pressure and recovery above the cut.' },
  { id: 3, name: 'Stonefold Ridge', element: 'Gleamric', description: 'Gleamric stone walls frame the ridge switchbacks. A lower trading post supplies the climb. Iven watches the open northern terrace.' },
  { id: 4, name: 'Quietfold Hollow', element: 'Hushmere', description: 'Hushmere woodland shelters a small final outpost. Two trails circle the quiet stone grove. Oren waits beyond the clearing before the return expedition.' }
]);
export const REGIONS = REGION_DEFINITIONS;

const dialogue = (first, second, third) => `${first}\n\n${second}\n\n${third}`;
function actor(id, type, x, z, label, role, words, extra = {}) {
  return { id, type, x, z, label, role, dialogue: words, ...extra };
}
const merchantWords = place => dialogue(`I keep supplies for ${place}.`, 'Check the price and stock before buying. Fiber can be sold or kept for a supply delivery.', 'The road will still be here when you return.');
const tailorWords = dialogue('Accessories should leave a partner free to move.', 'Choose a small badge, scarf or paper hat at the outpost. An accessory changes appearance, not strength.', 'You can return to the original look whenever you like.');
const mentorWords = dialogue('A field class is a way of caring for your team.', 'Captures, varied elements, trials and deliveries open different specializations.', 'Choose the approach that suits your partners.');
const contractWords = dialogue('The outpost needs three bundles of fiber.', 'Keep the bundles for a supply delivery if you want the posted Marks reward.', 'Each posted delivery can be paid only once.');
function services(prefix, positions) {
  const [merchant, tailor, mentor, counter] = positions;
  return [
    actor(`${prefix}-merchant`, 'merchant', ...merchant, 'Supply merchant', 'supplier', merchantWords('this outpost'), { shopId: `${prefix}-main`, principal: ['meadow','reach'].includes(prefix) }),
    actor(`${prefix}-tailor`, 'npc', ...tailor, 'Outpost tailor', 'tailor', tailorWords, { shopId: `${prefix}-main` }),
    actor(`${prefix}-mentor`, 'mentor', ...mentor, 'Field mentor', 'mentor', mentorWords, { principal: true }),
    actor(`${prefix}-counter`, 'contract', ...counter, 'Supply counter', 'courier', contractWords, { contractId: `${prefix}-main-supply` })
  ];
}
function resident(prefix, index, x, z, role, words) {
  return actor(`${prefix}-resident-${index}`, 'npc', x, z, role, role, dialogue(...words));
}
function roadPost(prefix, x, z, name) {
  return actor(`${prefix}-road-merchant`, 'merchant', x, z, name, 'road supplier', merchantWords(name),
    { shopId: `${prefix}-road`, contractId: `${prefix}-road-supply` });
}
function fixedPoints(rivalName, x, z, exitLabel, campX = -4, campZ = 18) {
  return [
    { id: 'camp', type: 'camp', x: campX, z: campZ, label: 'Rest Camp', role: 'recovery' },
    actor('rival', 'rival', x, z, rivalName, 'trailkeeper', dialogue(
      `I am ${rivalName}, the trailkeeper for this route.`, 'Watch your partners and leave room to recover before your next command.', 'Come to the clearing when your team is ready.'), { principal: true }),
    { id: 'exit', type: 'exit', x: 0, z: -70, label: exitLabel, role: 'route gate' }
  ];
}
function supplies(positions) {
  return positions.map(([x, z], i) => ({ id: `supply-${i}`, type: 'supply', x, z, label: 'Fiber bundle', role: 'field material', materialId: 'fiber', quantity: 3 }));
}
function prop(kind, x, z, w, h, d, color, extra = {}) {
  return { kind, x, z, w, h, d, color, ...extra };
}
function box(x, z, w, d) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}
const xy = pairs => pairs.map(([x, z]) => ({ x, z }));
const groveOffsets = [[-4,-3],[-1,-4],[2,-3],[4,-1],[-3,0],[0,0],[2,1],[-4,3],[-1,4],[3,4],[5,3],[5,-4]];
function scenery(palette, houses, rocks, groves, river, bridges, landmark) {
  const props = houses.map(([x,z,w,d]) => prop('house', x,z,w,3.6,d, COLORS.cream, { roofColor: palette.roof }));
  props.push(...rocks.map(([x,z,w,h,d]) => prop('rock', x,z,w,h,d,palette.stone)));
  for (const [x,z] of groves) for (const [dx,dz] of groveOffsets) {
    props.push(prop('tree', x+dx,z+dz,2.4,4.6,2.4,palette.leaves, { trunkColor: '#796956' }));
  }
  // The visible channel is continuous. Its collision boxes omit the bridge decks.
  props.push(prop('water', (river.minX+river.maxX)/2, 0, river.maxX-river.minX,0.04,160,palette.water));
  for (const z of bridges) props.push(prop('bridge', (river.minX+river.maxX)/2,z,river.maxX-river.minX+4,0.18,6,COLORS.path));
  props.push(prop('landmark', ...landmark,2.2,3.8,2.2,COLORS.amber));
  return props;
}
function layout({ palette, houses, rocks, groves, river, bridges, landmark, paths, points, wildSites, waynodes }) {
  const colliders = houses.map(([x,z,w,d]) => box(x,z,w,d));
  colliders.push(...rocks.map(([x,z,w,,d]) => box(x,z,w,d)));
  let start = BOUNDS.minZ;
  for (const z of [...bridges].sort((a,b) => a-b)) {
    colliders.push({ ...river, minZ: start, maxZ: z-3 });
    start = z+3;
  }
  colliders.push({ ...river, minZ: start, maxZ: BOUNDS.maxZ });
  // Authored obstacle corners give the small visibility graph room to turn.
  const corners = colliders.flatMap(c => xy([
    [c.minX-0.7,c.minZ-0.7], [c.maxX+0.7,c.minZ-0.7],
    [c.minX-0.7,c.maxZ+0.7], [c.maxX+0.7,c.maxZ+0.7]
  ])).filter(p => p.x > -79 && p.x < 79 && p.z > -79 && p.z < 79);
  return { bounds: { ...BOUNDS }, spawn: { x: 0, z: 16, yaw: 0 }, palette, pathWidth: 3.5,
    paths: paths.map(xy), props: scenery(palette,houses,rocks,groves,river,bridges,landmark),
    colliders, waynodes: [...xy(waynodes), ...corners], points, wildSites: wildSites.map(([x,z,habitatElement,tier]) => ({x,z,habitatElement,tier})) };
}

export const REGION_LAYOUTS = freeze([
  layout({
    palette: { ground: COLORS.sage, leaves: '#718267', stone: COLORS.cream, water: COLORS.blue, roof: COLORS.clay, path: COLORS.path },
    houses: [[-12,7,4,3],[8,4,8,6],[-12,27,8,6],[14,29,8,6],[-40,20,7,6]],
    rocks: [[32,-12,7,3,6],[-42,-50,9,4,8],[26,48,8,2.8,7]],
    groves: [[-60,-58],[-44,-28],[-60,32],[-44,62],[46,54],[64,20],[50,-24],[62,-58]],
    river: { minX: -24, maxX: -16 }, bridges: [-30,12], landmark: [16,-40],
    paths: [[[0,24],[0,16],[-10,4],[10,-8],[-10,-16],[0,-40],[0,-70]],
      [[-4,18],[-12,16],[-12,12],[-28,12],[-40,12]], [[-40,12],[-36,-30],[-12,-30],[0,-40]],
      [[-10,-16],[10,-24],[22,-26]], [[-12,16],[-12,20],[0,24],[12,22],[16,20]]],
    waynodes: [[0,16],[-12,16],[-28,12],[-12,12],[-40,12],[-36,-30],[-12,-30],[0,-40],[0,-70],[-10,4],[10,-8],[-10,-16],[10,-24],[22,-26],[0,24],[12,22],[16,20]],
    wildSites: [[-10,4,'Loamveil','basic'],[10,-8,'Loamveil','basic'],[-10,-16,'Rillune','basic']],
    points: [...fixedPoints('Maren',22,-26,'Path to Stillwater Reach'), ...services('meadow',[[4,16],[8,16],[8,10],[4,10]]),
      resident('meadow',0,-8,12,'Bridge keeper',['The west bridge is open.','Follow the pale trail across the water to the road post.','The northern bridge offers another way back.']),
      resident('meadow',1,-12,20,'Camp neighbor',['This clearing is our shared camp.','Rest before taking the northern trail.','A recovered team makes a safer survey.']),
      resident('meadow',2,12,22,'Field archivist',['The meadow ledger begins with observation.','Meet a partner on the trail before trying a kite.','Keep a note of where you found it.']),
      resident('meadow',3,16,20,'Woodland courier',['I carry messages between the two banks.','Maren is in the clearing northeast of the village.','Use the trail rather than the closed cottages.']),
      roadPost('meadow',-40,12,'West bridge road post'), ...supplies([[-30,8],[18,-18],[2,-50]])]
  }),
  layout({
    palette: { ground: '#c7c5a6', leaves: '#8b9b7a', stone: COLORS.cream, water: COLORS.blue, roof: '#9aab97', path: COLORS.path },
    houses: [[-12,7,4,3],[10,5,7,6],[-10,29,8,6],[14,34,8,6],[46,-12,7,6]],
    rocks: [[-42,-42,8,2.5,7],[36,42,7,2,8],[16,-48,8,2,6]],
    groves: [[-62,-58],[-48,-20],[-58,36],[-46,62],[56,56],[62,22],[54,-32],[66,-60]],
    river: { minX: 22, maxX: 30 }, bridges: [-20,28], landmark: [-18,-32],
    paths: [[[0,24],[0,16],[-8,2],[8,-12],[-10,-30],[0,-54],[0,-70]],
      [[0,24],[18,28],[34,28],[42,16],[40,-20],[18,-20],[8,-12]], [[-10,-30],[-28,-42],[-34,-54]]],
    waynodes: [[0,16],[0,24],[-8,2],[8,-12],[-10,-30],[0,-54],[0,-70],[18,28],[34,28],[42,16],[40,-20],[18,-20],[-28,-42],[-34,-54]],
    wildSites: [[-8,2,'Rillune','basic'],[12,-10,'Rillune','evolved'],[38,26,'Loamveil','basic']],
    points: [...fixedPoints('Sola',-34,-54,'Path to Emberstep Quarry'), ...services('reach',[[4,16],[8,18],[8,10],[4,10]]),
      resident('reach',0,-10,12,'Reed surveyor',['The channel is deeper than it looks.','Cross only at the two marked bridges.','Watch for Rillune partners beside the banks.']),
      resident('reach',1,-10,22,'Ferry neighbor',['We keep the crossing boards dry.','The southern bridge leads to the road post.','The northern bridge loops back toward Sola.']),
      resident('reach',2,12,22,'Nest observer',['The reeds shelter small partners.','Leave the bank clear when you make a field note.','A quiet approach is easier to observe.']),
      resident('reach',3,16,20,'Bank courier',['Both crossings reach the eastern bank.','Take supplies if your team needs a longer survey.','Return to camp before setting out again.']),
      roadPost('reach',40,-20,'Channel road post'), ...supplies([[18,24],[-18,-24],[44,-28]])]
  }),
  layout({
    palette: { ground: '#c9a990', leaves: '#929276', stone: COLORS.clay, water: COLORS.blue, roof: COLORS.amber, path: COLORS.path },
    houses: [[-12,7,4,3],[10,4,8,6],[-12,32,8,6],[16,30,8,6],[-51,-12,8,6]],
    rocks: [[24,-18,18,5,12],[38,-38,16,6,12],[-44,-46,12,5,9],[28,48,10,4,8]],
    groves: [[-64,-60],[-50,-30],[-62,38],[-46,62],[50,58],[66,22],[60,-24],[62,-60]],
    river: { minX: -28, maxX: -20 }, bridges: [-20,26], landmark: [8,-48],
    paths: [[[0,24],[0,16],[-8,2],[10,-10],[8,-32],[0,-50],[0,-70]],
      [[0,24],[-16,26],[-34,26],[-44,8],[-44,-20],[-16,-20],[10,-10]], [[8,-32],[16,-42],[24,-54]]],
    waynodes: [[0,16],[0,24],[-8,2],[10,-10],[8,-32],[0,-50],[0,-70],[-16,26],[-34,26],[-44,8],[-44,-20],[-16,-20],[16,-42],[24,-54]],
    wildSites: [[-8,2,'Cindrel','basic'],[10,-10,'Cindrel','evolved'],[-40,22,'Gleamric','evolved']],
    points: [...fixedPoints('Neri',24,-54,'Path to Stonefold Ridge'), ...services('quarry',[[4,16],[8,16],[8,10],[4,10]]),
      resident('quarry',0,-8,12,'Clay worker',['The quarry shelves are closed to walkers.','The pale trail goes around their edges.','Keep your partners on the open ground.']),
      resident('quarry',1,-12,22,'Kiln neighbor',['We rest while the clay cools.','Cindrel partners gather near the warm terraces.','Recovery matters as much as pressure.']),
      resident('quarry',2,12,22,'Workshop archivist',['Every terrace has a different stone.','Write down the habitat as well as the species.','Your ledger can guide the next survey.']),
      resident('quarry',3,18,22,'Quarry courier',['Neri trains beyond the upper shelf.','The western post stocks travel supplies.','Either bridge brings you back to the outpost.']),
      roadPost('quarry',-44,-20,'Kiln road post'), ...supplies([[-36,22],[4,-30],[20,-48]])]
  }),
  layout({
    palette: { ground: '#b9b7a3', leaves: '#90947b', stone: '#ded4b7', water: COLORS.blue, roof: COLORS.clay, path: COLORS.path },
    houses: [[-12,7,4,3],[10,4,8,6],[-12,29,8,6],[16,35,8,6],[50,18,8,6]],
    rocks: [[-30,-20,18,5,12],[12,-34,18,5,12],[-24,-52,16,6,10],[40,48,9,3,8]],
    groves: [[-64,-64],[-54,-32],[-62,32],[-46,62],[54,60],[66,32],[60,-24],[64,-60]],
    river: { minX: 26, maxX: 34 }, bridges: [-12,28], landmark: [-10,-66],
    paths: [[[0,24],[0,16],[-10,2],[0,-16],[-8,-30],[-8,-44],[8,-54],[22,-62],[0,-70]],
      [[0,24],[20,28],[40,28],[44,10],[40,-12],[20,-12],[0,-16]]],
    waynodes: [[0,16],[0,24],[-10,2],[0,-16],[-8,-30],[-8,-44],[8,-54],[22,-62],[0,-70],[20,28],[40,28],[44,10],[40,-12],[20,-12]],
    wildSites: [[-10,2,'Gleamric','basic'],[-8,-30,'Gleamric','evolved'],[42,-10,'Cindrel','evolved']],
    points: [...fixedPoints('Iven',22,-62,'Path to Quietfold Hollow'), ...services('ridge',[[4,16],[8,16],[8,10],[4,10]]),
      resident('ridge',0,-8,12,'Trail mason',['The climb follows the stone edges.','The switchback leaves room beside each wall.','Do not cut across the closed ledges.']),
      resident('ridge',1,-12,22,'Ridge neighbor',['The lower camp is sheltered.','Rest here before the upper terrace.','Iven values a team with several answers.']),
      resident('ridge',2,14,22,'Mineral observer',['Gleamric partners favor the open stone.','Look on both sides of the bridge route.','A careful survey is worth another walk.']),
      roadPost('ridge',44,10,'Lower ridge road post'), ...supplies([[20,24],[-10,-40],[18,-56]])]
  }),
  layout({
    palette: { ground: '#adb49e', leaves: '#7e8c79', stone: COLORS.cream, water: COLORS.blue, roof: COLORS.amber, path: COLORS.path },
    houses: [[-12,7,4,3],[18,4,8,6],[-12,29,8,6],[16,30,8,6]],
    rocks: [[-2,-28,14,4,12],[24,-44,10,4,10],[-46,44,9,3,8]],
    groves: [[-62,-60],[-48,-26],[-64,30],[-48,62],[50,58],[64,22],[58,-24],[62,-62]],
    river: { minX: -32, maxX: -24 }, bridges: [-40,16], landmark: [0,-50],
    paths: [[[0,24],[0,16],[-10,2],[-14,-14],[-14,-38],[0,-56],[0,-70]],
      [[0,16],[-18,16],[-38,16],[-42,-8],[-38,-40],[-18,-40],[-14,-38]],
      [[0,16],[14,-6],[18,-28],[14,-54],[0,-56]]],
    waynodes: [[0,16],[0,24],[-10,2],[-14,-14],[-14,-38],[0,-56],[0,-70],[-18,16],[-38,16],[-42,-8],[-38,-40],[-18,-40],[14,-6],[18,-28],[14,-54]],
    wildSites: [[-10,2,'Hushmere','basic'],[-14,-38,'Hushmere','evolved'],[18,-28,'Loamveil','evolved']],
    points: [...fixedPoints('Oren',14,-54,'Return expedition gate'), ...services('hollow',[[4,16],[8,16],[8,10],[4,10]]),
      resident('hollow',0,-8,12,'Grove keeper',['Two trails circle the quiet grove.','The western path crosses the stream twice.','The eastern path stays beside the stone.']),
      resident('hollow',1,-12,22,'Hollow neighbor',['The last outpost is still a place to rest.','You do not need to rush the return route.','Bring every partner back in good condition.']),
      resident('hollow',2,14,22,'Quiet surveyor',['Hushmere partners shelter near the grove.','Observe before choosing your next command.','A pause can change a difficult encounter.']),
      resident('hollow',3,18,22,'Return courier',['Oren waits beyond the eastern trail.','The return gate stands north of the grove.','The final expedition is a separate journey.']),
      ...supplies([[-40,12],[-18,-34],[12,-48]])]
  })
]);

function getLayout(region) {
  if (!Number.isInteger(region) || region < 0 || region >= REGION_LAYOUTS.length) throw new RangeError('Invalid region index.');
  return REGION_LAYOUTS[region];
}
function checkPoint(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) throw new TypeError('Expected finite x/z position.');
}
function inside(point, c) {
  return point.x > c.minX-RADIUS+EPSILON && point.x < c.maxX+RADIUS-EPSILON &&
    point.z > c.minZ-RADIUS+EPSILON && point.z < c.maxZ+RADIUS-EPSILON;
}
function walkable(layout, point) {
  const b = layout.bounds;
  return point.x >= b.minX+RADIUS && point.x <= b.maxX-RADIUS &&
    point.z >= b.minZ+RADIUS && point.z <= b.maxZ-RADIUS && !layout.colliders.some(c => inside(point,c));
}
function clearSegment(layout, from, to) {
  return !layout.colliders.some(c => {
    let low = 0, high = 1;
    for (const axis of ['x','z']) {
      const min = c[axis === 'x' ? 'minX' : 'minZ']-RADIUS+EPSILON;
      const max = c[axis === 'x' ? 'maxX' : 'maxZ']+RADIUS-EPSILON;
      const delta = to[axis]-from[axis];
      if (delta === 0) { if (from[axis] <= min || from[axis] >= max) return false; }
      else {
        const a = (min-from[axis])/delta, b = (max-from[axis])/delta;
        low = Math.max(low,Math.min(a,b));
        high = Math.min(high,Math.max(a,b));
        if (low >= high) return false;
      }
    }
    return low < high;
  });
}

export function movePosition(region, position, dx, dz) {
  const layout = getLayout(region);
  checkPoint(position);
  const yaw = Object.hasOwn(position,'yaw') ? position.yaw : 0;
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || !Number.isFinite(yaw)) throw new TypeError('Expected finite movement and yaw.');
  if (!walkable(layout,position)) throw new RangeError('Starting position is not walkable.');
  const result = { x: position.x, z: position.z, yaw };
  for (const [axis, delta, other, minKey, maxKey, otherMin, otherMax] of [
    ['x',dx,'z','minX','maxX','minZ','maxZ'], ['z',dz,'x','minZ','maxZ','minX','maxX']
  ]) {
    let next = Math.max(layout.bounds[minKey]+RADIUS,Math.min(layout.bounds[maxKey]-RADIUS,result[axis]+delta));
    for (const c of layout.colliders) {
      if (result[other] <= c[otherMin]-RADIUS+EPSILON || result[other] >= c[otherMax]+RADIUS-EPSILON) continue;
      if (next > result[axis] && result[axis] <= c[minKey]-RADIUS+EPSILON) next = Math.min(next,c[minKey]-RADIUS);
      if (next < result[axis] && result[axis] >= c[maxKey]+RADIUS-EPSILON) next = Math.max(next,c[maxKey]+RADIUS);
    }
    result[axis] = next;
  }
  return result;
}

export function routeTo(region, from, target) {
  const layout = getLayout(region);
  checkPoint(from);
  checkPoint(target);
  if (!walkable(layout,from) || !walkable(layout,target)) return [];
  if (clearSegment(layout,from,target)) return [{ x: target.x, z: target.z }];
  const nodes = [from,target,...layout.waynodes.filter(p => walkable(layout,p))];
  const distances = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  distances[0] = 0;
  // ponytail: quadratic scan of fewer than 100 authored nodes; use a heap only if maps grow.
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (current < 0 || distances[i] < distances[current])) current = i;
    if (current < 0 || !Number.isFinite(distances[current])) return [];
    if (current === 1) {
      const route = [];
      for (let i = 1; i !== 0; i = previous[i]) route.unshift({ x: nodes[i].x, z: nodes[i].z });
      return route;
    }
    visited.add(current);
    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(i) || !clearSegment(layout,nodes[current],nodes[i])) continue;
      const distance = distances[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].z-nodes[current].z);
      if (distance < distances[i]) { distances[i] = distance; previous[i] = current; }
    }
  }
  return [];
}
