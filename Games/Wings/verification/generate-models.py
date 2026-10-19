"""Original AI-authored aircraft geometry; Python stdlib only. See ../docs/models.md.
Run from any directory: python3 -B Games/Wings/verification/generate-models.py
"""
import hashlib
import json
import math
from pathlib import Path
import struct

OUT = Path(__file__).resolve().parents[1] / 'models'


class Model:
    def __init__(self, name, colors):
        self.data = bytearray()
        self.doc = {
            'asset': {'version': '2.0', 'generator': 'Wings astra geometry generator v1 (openai-codex/gpt-6-astra)'},
            'scene': 0, 'scenes': [{'nodes': [0]}],
            'nodes': [{'name': name, 'children': []}], 'meshes': [],
            'materials': [{'name': n, 'pbrMetallicRoughness': {
                'baseColorFactor': [*rgb, 1], 'metallicFactor': metal,
                'roughnessFactor': rough}} for n, rgb, metal, rough in colors],
            'accessors': [], 'bufferViews': [],
            'extras': {'forward': '-Z', 'up': '+Y', 'units': 'meters',
                       'provenance': 'Original generated geometry; no third-party model, image or texture input.'}}

    def node(self, name, position=(0, 0, 0), parent=0):
        nodes = self.doc['nodes']
        idx = len(nodes)
        nodes.append({'name': name, 'translation': list(position), 'children': []})
        nodes[parent].setdefault('children', []).append(idx)
        return idx

    def accessor(self, values, width, indices=False):
        while len(self.data) % 4:
            self.data.append(0)
        offset = len(self.data)
        self.data.extend(struct.pack('<' + ('H' if indices else 'f') * len(values), *values))
        views, acc = self.doc['bufferViews'], self.doc['accessors']
        views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(self.data) - offset,
                      'target': 34963 if indices else 34962})
        a = {'bufferView': len(views) - 1, 'componentType': 5123 if indices else 5126,
             'count': len(values) // width, 'type': {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3'}[width]}
        if width == 3:
            a['min'] = [min(values[k::3]) for k in range(3)]
            a['max'] = [max(values[k::3]) for k in range(3)]
        acc.append(a)
        return len(acc) - 1

    def solid(self, name, vertices, faces, material, parent=0):
        # Convex solids only: orient each triangle away from the solid centroid.
        center = [sum(p[k] for p in vertices) / len(vertices) for k in range(3)]
        positions, normals, uv, indices = [], [], [], []
        shared = {}
        for face in faces:
            for i in range(1, len(face) - 1):
                a, b, c = (vertices[j] for j in (face[0], face[i], face[i + 1]))
                u, v = ([b[k] - a[k] for k in range(3)], [c[k] - a[k] for k in range(3)])
                n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                length = math.sqrt(sum(x*x for x in n))
                if length < 1e-9:
                    continue
                if sum(n[k] * (a[k] - center[k]) for k in range(3)) < 0:
                    b, c = c, b
                    n = [-x for x in n]
                for p in (a, b, c):
                    normal = tuple(x / length for x in n)
                    tex = (p[0] / 20 + .5, p[2] / 20 + .5)
                    key = (*p, *normal, *tex)
                    index = shared.get(key)
                    if index is None:
                        index = len(positions) // 3
                        shared[key] = index
                        positions.extend(p)
                        normals.extend(normal)
                        uv.extend(tex)
                    indices.append(index)
        primitive = {'attributes': {'POSITION': self.accessor(positions, 3),
                                   'NORMAL': self.accessor(normals, 3),
                                   'TEXCOORD_0': self.accessor(uv, 2)},
                     'indices': self.accessor(indices, 1, True),
                     'material': material, 'mode': 4}
        idx = self.node(name, parent=parent)
        self.doc['nodes'][idx]['mesh'] = len(self.doc['meshes'])
        self.doc['meshes'].append({'name': name, 'primitives': [primitive]})

    def loft(self, name, rings, material, parent=0, sides=8):
        # Rings: z, radius x, radius y, center x, center y.
        vertices = [(cx + rx*math.cos(i*math.tau/sides), cy + ry*math.sin(i*math.tau/sides), z)
                    for z, rx, ry, cx, cy in rings for i in range(sides)]
        faces = [list(range(sides)), list(range((len(rings)-1)*sides, len(rings)*sides))]
        for r in range(len(rings)-1):
            for i in range(sides):
                j = (i+1) % sides
                faces.append([r*sides+i, r*sides+j, (r+1)*sides+j, (r+1)*sides+i])
        self.solid(name, vertices, faces, material, parent)

    def slab(self, name, outline, axis, thickness, material, parent=0):
        vertices = []
        for sign in (-1, 1):
            for point in outline:
                p = list(point)
                p[axis] += sign * thickness / 2
                vertices.append(p)
        n = len(outline)
        faces = [list(range(n)), list(range(n, 2*n))]
        faces += [[i, (i+1) % n, (i+1) % n+n, i+n] for i in range(n)]
        self.solid(name, vertices, faces, material, parent)

    def box(self, name, center, size, material, parent=0):
        x, y, z = center
        a, b, c = (n/2 for n in size)
        self.slab(name, [(x-a,y,z-c),(x+a,y,z-c),(x+a,y,z+c),(x-a,y,z+c)], 1, b*2, material, parent)

    def finish(self):
        while len(self.data) % 4:
            self.data.append(0)
        self.doc['buffers'] = [{'byteLength': len(self.data)}]
        j = json.dumps(self.doc, separators=(',', ':'), sort_keys=True).encode()
        j += b' ' * (-len(j) % 4)
        size = 12 + 8 + len(j) + 8 + len(self.data)
        return (struct.pack('<4sII', b'glTF', 2, size) + struct.pack('<I4s', len(j), b'JSON') + j
                + struct.pack('<I4s', len(self.data), b'BIN\0') + self.data)


def f15_patch(m, name, surface, rows, columns, material, reverse=False, parent=0):
    """Sample an exterior contour with shared vertices and area-weighted normals.

    Separate patches deliberately split normals at intake lips and control edges.
    The two angular seam rows coincide, but no triangles are duplicated.
    """
    vertices = [surface(i / rows, j / columns)
                for i in range(rows + 1) for j in range(columns + 1)]
    normals = [[0., 0., 0.] for _ in vertices]
    indices = []
    for i in range(rows):
        for j in range(columns):
            a = i * (columns + 1) + j
            for tri in ((a, a + columns + 1, a + 1),
                        (a + 1, a + columns + 1, a + columns + 2)):
                if reverse:
                    tri = tri[::-1]
                p, q, r = (vertices[k] for k in tri)
                u = [q[k] - p[k] for k in range(3)]
                v = [r[k] - p[k] for k in range(3)]
                n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                assert sum(x*x for x in n) > 1e-18, (name, tri)
                for k in tri:
                    for axis in range(3):
                        normals[k][axis] += n[axis]
                indices.extend(tri)
    normals = [tuple(x / math.sqrt(sum(y*y for y in n)) for x in n) for n in normals]
    primitive = {'attributes': {
        'POSITION': m.accessor([x for p in vertices for x in p], 3),
        'NORMAL': m.accessor([x for n in normals for x in n], 3),
        'TEXCOORD_0': m.accessor([x for i in range(rows + 1) for j in range(columns + 1)
                                for x in (i / rows, j / columns)], 2)},
        'indices': m.accessor(indices, 1, True), 'material': material, 'mode': 4}
    node = m.node(name, parent=parent)
    m.doc['nodes'][node]['mesh'] = len(m.doc['meshes'])
    m.doc['meshes'].append({'name': name, 'primitives': [primitive]})


def dark_paint(m):
    """Authored linear colors; the runtime also applies jet-specific paint overrides."""
    def linear(c):
        c /= 255
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    for index, rgb in {0: (35, 38, 40), 1: (44, 47, 48), 5: (41, 44, 46),
                       6: (29, 31, 32), 7: (34, 37, 39)}.items():
        m.doc['materials'][index]['pbrMetallicRoughness']['baseColorFactor'] = [
            *(linear(c) for c in rgb), 1]
    m.doc['materials'].extend([
        {'name': 'exhaust_core', 'emissiveFactor': [1, .23, .035],
         'pbrMetallicRoughness': {'baseColorFactor': [1, .23, .035, 1],
                                  'metallicFactor': 0, 'roughnessFactor': .7}},
        {'name': 'missile_gray', 'pbrMetallicRoughness': {
            'baseColorFactor': [.24, .26, .28, 1], 'metallicFactor': .1,
            'roughnessFactor': .7}}])


def missile(m, name, position, parent=0):
    """Rigid removable store, local -Z nose, matching the existing ammo visibility rig."""
    pivot = m.node(name, position, parent)
    m.loft(name+'_body', [(-1.45,.015,.015,0,0), (-1.05,.105,.105,0,0),
                         (1.2,.105,.105,0,0), (1.38,.075,.075,0,0)],
           11, pivot, sides=12)
    for axis in (0, 1):
        for sign in (-1, 1):
            outline = [(0,0,.55),(0,0,1.28),(0,0,1.38)]
            for tip in (0, 2):
                outline[tip] = tuple(sign*.10 if k == axis else v
                                     for k,v in enumerate(outline[tip]))
            outline[1] = tuple(sign*.30 if k == axis else v
                               for k,v in enumerate(outline[1]))
            m.slab(name+'_fin_'+str(axis)+'_'+str(sign), outline,
                   1-axis, .025, 3, pivot)
    m.loft(name+'_band', [(-.55,.108,.108,0,0),(-.43,.108,.108,0,0)],
           8, pivot, sides=12)
    return pivot


def afterburner(m, name, position, radius):
    pivot = m.node(name, position)
    m.loft(name+'_disc', [(-.025,radius,radius,0,0),(.025,radius,radius,0,0)],
           10, pivot, sides=24)


def meter_scale(m, scale):
    """Bake meter corrections into geometry and anchors, keeping an identity root."""
    for mesh in m.doc['meshes']:
        for primitive in mesh['primitives']:
            for attribute in ('POSITION', 'NORMAL'):
                a = m.doc['accessors'][primitive['attributes'][attribute]]
                view = m.doc['bufferViews'][a['bufferView']]
                values = list(struct.unpack_from('<'+'f'*(a['count']*3), m.data, view['byteOffset']))
                for i in range(0, len(values), 3):
                    p = [values[i+k] * scale[k] if attribute == 'POSITION'
                         else values[i+k] / scale[k] for k in range(3)]
                    if attribute == 'NORMAL':
                        length = math.sqrt(sum(x*x for x in p))
                        p = [x/length for x in p]
                    values[i:i+3] = p
                struct.pack_into('<'+'f'*len(values), m.data, view['byteOffset'], *values)
                if attribute == 'POSITION':
                    a['min'] = [round(min(values[k::3]), 6) for k in range(3)]
                    a['max'] = [round(max(values[k::3]), 6) for k in range(3)]
                else:
                    # glTF requires position bounds; normal bounds are optional.
                    a.pop('min', None)
                    a.pop('max', None)
    for node in m.doc['nodes']:
        if 'translation' in node:
            node['translation'] = [node['translation'][k]*scale[k] for k in range(3)]


def f15():
    """Original gear-up F-15-style exterior; no mesh/image/reference asset input.

    Dimensions are approximate meter-like proportions, not engineering drawings.
    Dense curved skin, airfoil sections and nozzle petals carry the budget;
    there is no subdivision of hidden bulkheads to meet the triangle floor.
    """
    m = Model('f15', [
        ('airframe_gray', (.43, .45, .47), .1, .8),
        ('control_gray', (.54, .55, .56), .1, .8),
        ('canopy_glass', (.065, .10, .14), .05, .18),
        ('nozzle_metal', (.19, .20, .21), .55, .65),
        ('intake_shadow', (.035, .038, .04), 0, .95),
        ('belly_gray', (.62, .64, .65), .1, .8),
        ('radome_gray', (.34, .36, .38), .05, .85),
        ('panel_gray', (.28, .31, .34), .1, .8),
        ('collar_metal', (.38, .40, .42), .65, .48),
        ('livery_slate', (.12, .22, .34), .1, .75)])
    m.doc['materials'][2]['alphaMode'] = 'BLEND'
    m.doc['materials'][2]['pbrMetallicRoughness']['baseColorFactor'][3] = .38
    dark_paint(m)

    # Smooth cosine interpolation of fuselage stations avoids faceted cylinders.
    stations = [(-9.7, .025, .025, -.12), (-7.7, .38, .40, -.04),
                (-5.5, .65, .68, .04), (-3, .73, .72, .08),
                (0, .80, .57, .08), (3.6, .73, .46, .06),
                (6.8, .48, .32, .03), (7.6, .08, .12, .02)]

    def body(u, v):
        z = -9.7 + 17.3 * u
        a, b = next((a, b) for a, b in zip(stations, stations[1:]) if z <= b[0] + 1e-8)
        t = (1 - math.cos(math.pi * (z-a[0]) / (b[0]-a[0]))) / 2
        rx, ry, cy = [a[k] + (b[k]-a[k])*t for k in (1, 2, 3)]
        angle = math.tau*v
        return (rx*math.cos(angle), cy+ry*math.sin(angle), z)

    # Separate actual skin regions, omitting the cockpit aperture rather than
    # covering an intact fuselage with glass. Bounds meet the canopy sill exactly.
    start, end = 3/17.3, 7.1/17.3
    for name, a, b, rows, mat in [('radome', 0, start, 24, 6),
                                 ('cockpit_skin', start, end, 30, 0),
                                 ('fuselage', end, 1, 60, 0)]:
        for part, lo, hi, cols, material in [('belly', .5, 1, 28, 5),
                                           ('right', 0, .12, 7, mat),
                                           ('left', .38, .5, 7, mat),
                                           ('top', .12, .38, 14, mat)]:
            if name == 'cockpit_skin' and part == 'top':
                continue
            f15_patch(m, name+'_'+part,
                      lambda u, v: body(a+(b-a)*u, lo+(hi-lo)*v), rows, cols, material, True)

    def canopy(u, v):
        x, y, z = body(start+(end-start)*u, .12)
        return (x*math.cos(math.pi*v), y+(.06+.66*math.sin(math.pi*u)**.8)*math.sin(math.pi*v), z)

    f15_patch(m, 'canopy', canopy, 48, 24, 2, True)
    for name, u in [('windscreen', 0), ('bow', .22), ('rear', .99)]:
        def frame(w, v):
            x, y, z = canopy(u+.01*w, v)
            return (x*1.012, y+.012, z)
        f15_patch(m, 'canopy_frame_'+name, frame, 2, 24, 7, True)
    for side, v in [('R', 0), ('L', 1)]:
        def sill(u, w):
            x, y, z = canopy(u, v)
            return (x+(w-.5)*.055, y+.015, z)
        f15_patch(m, 'canopy_sill_'+side, sill, 32, 1, 7)
        def tub(u, w):
            x, y, z = canopy(u, v)
            return (x, y-(y-.04)*w, z)
        f15_patch(m, 'cockpit_tub_'+side, tub, 32, 2, 4, side == 'R')
    m.box('cockpit_floor', (0,.015,-4.65), (.85,.05,3.9), 4)
    m.box('seat_cushion', (0,.19,-4.5), (.48,.16,.65), 7)
    m.box('seat_back', (0,.48,-4.12), (.49,.65,.14), 4)
    m.box('seat_headrest', (0,.84,-4.12), (.30,.18,.17), 7)
    m.box('instrument_coaming', (0,.47,-5.7), (.59,.14,.48), 4)
    for name, u in [('front', 0), ('rear', 1)]:
        x,y,z = canopy(u,0)
        m.box('cockpit_bulkhead_'+name, (0,y/2,z), (2*x,y,.025), 4)

    for side, sign in [('L', -1), ('R', 1)]:
        # Broad shoulder-mounted swept wing with a rounded airfoil, tapered tips.
        # Angular sampling resolves both leading-edge curvature and trailing edge.
        def wing(u, v):
            chord = 5.3 - 3.7*u
            angle = math.tau*v
            return (sign*(1.18+5.32*u), .23-.12*u + (.16-.13*u)*math.sin(angle),
                    -2.8+4.35*u + chord*(1-math.cos(angle))/2)

        f15_patch(m, 'wing_'+side, wing, 30, 48, 0, sign > 0)
        # Conforming narrow strips follow the airfoil, not floating box seams.
        for name, a, b, v, mat in [('flap_line', .02, .48, .34, 4),
                                  ('aileron_line', .51, .96, .34, 4),
                                  ('livery_wing', .82, .92, .19, 9)]:
            def strip(u, w):
                x,y,z = wing(a+(b-a)*u, v+w*(.004 if mat == 4 else .08))
                return (x,y+.006,z)
            f15_patch(m, name+'_'+side, strip, 24, 2, mat, sign > 0)
        m.node('weapon_wing_'+side+'_inner', (sign*2.55,-.02,.1))
        m.node('weapon_wing_'+side+'_outer', (sign*4.25,-.02,1.25))

        def stabilizer(u, v):
            angle = math.tau*v
            return (sign*(1.15+2.8*u), -.12-.18*u + (.10-.08*u)*math.sin(angle),
                    4.1+2.25*u + (3.5-2.1*u)*(1-math.cos(angle))/2)

        f15_patch(m, 'stabilizer_'+side, stabilizer, 20, 32, 1, sign > 0)
        def stab_line(u, v):
            x,y,z = stabilizer(.04+.92*u, .34+.005*v)
            return (x,y+.005,z)
        f15_patch(m, 'stab_line_'+side, stab_line, 24, 1, 4, sign > 0)

        # Upright, widely separated twin vertical tails, not stealth-style cant.
        def fin(u, v):
            angle = math.tau*v
            return (sign*1.40 + (.10-.075*u)*math.sin(angle), .46+3.0*u,
                    2.8+2.05*u + (4.5-2.65*u)*(1-math.cos(angle))/2)

        f15_patch(m, 'fin_'+side, fin, 20, 32, 0)
        for face in (0, 1):
            for name, a, b, v, width, mat in [('livery_fin', .72, .83, .12, .26, 9),
                                            ('rudder_line', .04, .95, .36, .005, 4)]:
                def marking(u, w):
                    x,y,z = fin(a+(b-a)*u, v+width*w+face*.5)
                    return (x+(.005 if face == 0 else -.005),y,z)
                f15_patch(m, name+'_'+side+'_'+str(face), marking, 16, 4, mat)

        # Rounded-square intake trunk transitions to a circular engine nacelle.
        def engine(u, v):
            angle = math.tau*v
            c, s = math.cos(angle), math.sin(angle)
            blend = (1-math.cos(math.pi*min(1, u*1.8)))/2
            square_x = math.copysign(abs(c)**.22, c)
            square_y = math.copysign(abs(s)**.22, s)
            radius = .64 + .055*math.sin(math.pi*u)
            return (sign*1.30 + radius*((1-blend)*square_x+blend*c),
                    -.16 + radius*((1-blend)*square_y+blend*s), -3.6+10.9*u)

        f15_patch(m, 'engine_'+side, engine, 48, 40, 0, True)
        for name, a, b, lo, hi, mat in [('engine_access', .28, .48, .03, .18, 7),
                                      ('gear_door', .17, .36, .66, .84, 1)]:
            def panel(u, v):
                x,y,z = engine(a+(b-a)*u, lo+(hi-lo)*v)
                return (sign*1.30+(x-sign*1.30)*1.006, -.16+(y+.16)*1.006,z)
            f15_patch(m, name+'_'+side, panel, 16, 8, mat, True)
        m.node('weapon_fuselage_'+side, (sign*.90,-.70,.4))
        # Recessed visible intake face; four lip strips leave a rectangular mouth.
        m.box('intake_throat_'+side, (sign*1.30, -.16, -3.37), (1.10, 1.10, .025), 4)
        for dy in (-.62, .62):
            m.box('intake_lip_'+side+str(dy), (sign*1.30, -.16+dy, -3.62), (1.30, .075, .14), 1)
        for dx in (-.62, .62):
            m.box('intake_side_'+side+str(dx), (sign*1.30+dx, -.16, -3.62), (.075, 1.17, .14), 1)

        # Exposed petalled nozzle and its visible inner wall, open at the rear.
        def nozzle(u, v):
            angle = math.tau*v
            radius = .64-.13*u + .014*math.cos(20*angle)*math.sin(math.pi*u)
            return (sign*1.30+radius*math.cos(angle), -.16+radius*math.sin(angle), 7.3+1.15*u)

        # Collar and alternating petal sectors reuse two metal definitions.
        f15_patch(m, 'exhaust_collar_'+side,
                  lambda u,v: nozzle(u*.22,v), 3, 60, 8, True)
        for petal in range(20):
            f15_patch(m, 'exhaust_petal_'+side+'_'+str(petal),
                      lambda u,v: nozzle(.22+.78*u,(petal+v)/20),
                      9, 3, 3 if petal % 2 else 8, True)
        def nozzle_inside(u, v):
            angle = math.tau*v
            radius = .48+.03*u
            return (sign*1.30+radius*math.cos(angle), -.16+radius*math.sin(angle), 7.8+.65*u)
        f15_patch(m, 'nozzle_inner_'+side, nozzle_inside, 4, 60, 4)
        m.loft('exhaust_recess_'+side, [(7.78,.48,.48,sign*1.30,-.16),
                                       (7.80,.48,.48,sign*1.30,-.16)], 4, sides=24)
        m.node('exhaust_'+side, (sign*1.30, -.16, 8.45))
        afterburner(m, 'afterburner_'+side, (sign*1.30, -.16, 8.40), .46)
        # Existing weapon slots: pilot heatseekers and seat-two guided missiles.
        missile(m, 'missile_'+side+'1', (sign*2.55,-.48,.1))
        missile(m, 'missile_'+side+'2', (sign*4.25,-.40,1.25))
        for slot, x, y, z in [(1,2.55,-.24,.1),(2,4.25,-.20,1.25)]:
            m.box('pylon_'+side+str(slot), (sign*x,y,z), (.09,.35,.95), 7)
    m.loft('pitot', [(-10.05,.008,.008,0,-.12),(-9.55,.022,.022,0,-.12)], 8, sides=8)
    m.slab('antenna_spine', [(0,.64,-1.6),(0,1.02,-1.15),(0,.64,-.9)], 0,.045,7)
    m.node('weapon_centerline', (0,-.57,.4))
    m.node('cockpit', (0, 1.05, -4.9))
    m.node('gun_muzzle', (1.03, .27, -3.9))
    meter_scale(m, (1, 1, 19.44/18.5))
    return m


def f35():
    """Original gear-up F-35-style surface, without reference assets.

    Broad chine shoulders blend into trapezoidal wings around one engine.
    Tessellation follows exposed curved skins, airfoils and nozzle petals.
    """
    m = Model('f35', [
        ('airframe_gray', (.42, .44, .46), .1, .82),
        ('edge_gray', (.53, .54, .55), .1, .8),
        ('canopy_glass', (.065, .10, .14), .05, .18),
        ('nozzle_metal', (.21, .22, .23), .55, .65),
        ('recess_gray', (.035, .04, .045), 0, .95),
        ('belly_gray', (.60, .62, .64), .1, .82),
        ('radome_gray', (.30, .32, .34), .05, .85),
        ('panel_gray', (.27, .29, .31), .1, .8),
        ('collar_metal', (.38, .40, .42), .65, .48),
        ('livery_slate', (.12, .22, .34), .1, .75)])
    m.doc['materials'][2]['alphaMode'] = 'BLEND'
    m.doc['materials'][2]['pbrMetallicRoughness']['baseColorFactor'][3] = .38
    dark_paint(m)
    stations = [(-8.0, .018, .025, -.08), (-6.4, .66, .43, -.03),
                (-4.5, 1.06, .70, .02), (-2.5, 1.62, .82, .02),
                (0, 1.85, .79, 0), (2.5, 1.60, .68, 0),
                (4.8, 1.04, .58, .01), (6.0, .70, .58, .01)]

    def body(u, v):
        z = -8 + 14*u
        a, b = next((a, b) for a, b in zip(stations, stations[1:]) if z <= b[0]+1e-8)
        t = (1-math.cos(math.pi*(z-a[0])/(b[0]-a[0])))/2
        rx, ry, cy = [a[k]+(b[k]-a[k])*t for k in (1, 2, 3)]
        c, s = math.cos(math.tau*v), math.sin(math.tau*v)
        chine = .66 if z < -4.5 else .66+.06*min(1, (z+4.5)/2)
        return (rx*math.copysign(abs(c)**chine, c),
                cy+ry*math.copysign(abs(s)**.85, s), z)

    # Omit the upper skin inside the cockpit, rather than glazing over solid skin.
    start, end = 2.2/14, 5.6/14
    for name, a, b, rows, mat in [('radome', 0, start, 20, 6),
                                 ('cockpit_skin', start, end, 32, 0),
                                  ('fuselage', end, 1, 68, 0)]:
        for part, lo, hi, cols, material in [('belly', .5, 1, 32, 5),
                                           ('right', 0, .16, 10, mat),
                                           ('left', .34, .5, 10, mat),
                                           ('top', .16, .34, 12, mat)]:
            if name == 'cockpit_skin' and part == 'top':
                continue
            if name == 'fuselage' and part == 'belly':
                # Preserve the original contour around two actual bay apertures.
                for band, vlo, vhi, ncols in [('left', .5, .625, 10),
                                             ('keel', .744, .756, 3),
                                             ('right', .875, 1, 10)]:
                    f15_patch(m, 'bay_surround_'+band,
                              lambda u,v: body(.4+.36*u, vlo+(vhi-vlo)*v),
                              40, ncols, material, True)
                f15_patch(m, 'fuselage_belly_aft',
                          lambda u,v: body(.76+.24*u, .5+.5*v), 28, 32, material, True)
                continue
            f15_patch(m, name+'_'+part,
                      lambda u,v: body(a+(b-a)*u,lo+(hi-lo)*v), rows,cols,material,True)

    def canopy(u, v):
        x,y,z = body(start+(end-start)*u, .16)
        return (x*math.cos(math.pi*v),
                y+(.04+.58*math.sin(math.pi*u)**.8)*math.sin(math.pi*v), z)

    f15_patch(m, 'canopy', canopy, 48, 24, 2, True)
    for name, u in [('windscreen', 0), ('bow', .22), ('rear', .99)]:
        def frame(w, v):
            x,y,z = canopy(u+.01*w,v)
            return (x*1.012,y+.012,z)
        f15_patch(m, 'canopy_frame_'+name, frame, 2,24,7,True)
    for side, v in [('R',0), ('L',1)]:
        def sill(u,w):
            x,y,z = canopy(u,v)
            return (x+(w-.5)*.06,y+.012,z)
        f15_patch(m, 'canopy_sill_'+side, sill, 32,1,7)
        def tub(u,w):
            x,y,z = canopy(u,v)
            return (x,y-(y-.04)*w,z)
        f15_patch(m, 'cockpit_tub_'+side, tub, 32,2,4,side == 'R')
    m.box('cockpit_floor', (0,.02,-4.1), (.65,.04,3.35), 4)
    m.box('seat_cushion', (0,.24,-3.75), (.48,.16,.65), 7)
    m.box('seat_back', (0,.55,-3.4), (.49,.65,.14), 4)
    m.box('seat_headrest', (0,.91,-3.4), (.30,.18,.17), 7)
    m.box('instrument_coaming', (0,.51,-4.9), (.58,.14,.48), 4)
    for name,u in [('front',0), ('rear',1)]:
        x,y,z = canopy(u,0)
        m.box('cockpit_bulkhead_'+name, (0,y/2,z), (2*x,y,.025), 4)
    for side, sign in [('L', -1), ('R', 1)]:
        def wing(u, v):
            angle = math.tau*v
            return (sign*(1.28+4.02*u), .10-.13*u+(.16-.135*u)*math.sin(angle),
                    -2.5+3.55*u+(4.8-3.3*u)*(1-math.cos(angle))/2)
        f15_patch(m, 'wing_'+side, wing, 36, 56, 0, sign > 0)
        for name,a,b,v,width,mat in [('leading_edge', .04,.98,.015,.065,1),
                                    ('flap_line', .04,.49,.34,.005,4),
                                    ('aileron_line', .52,.96,.34,.005,4),
                                    ('livery_wing', .83,.93,.19,.08,9)]:
            def strip(u,w):
                x,y,z = wing(a+(b-a)*u,v+width*w)
                return (x,y+.007,z)
            f15_patch(m, name+'_'+side, strip, 24,4,mat,sign > 0)
        m.node('weapon_wing_'+side, (sign*2.8,-.1,.4))

        def stabilizer(u, v):
            angle = math.tau*v
            return (sign*(.83+2.40*u), -.02-.16*u+(.09-.07*u)*math.sin(angle),
                    3.2+1.7*u+(2.9-1.55*u)*(1-math.cos(angle))/2)
        f15_patch(m, 'stabilizer_'+side, stabilizer, 24, 32, 1, sign > 0)
        def stab_line(u,v):
            x,y,z = stabilizer(.04+.92*u,.34+.005*v)
            return (x,y+.006,z)
        f15_patch(m, 'stab_line_'+side, stab_line, 24,1,4,sign > 0)

        def fin(u, v):
            angle = math.tau*v
            return (sign*(1.15+1.06*u)+(.10-.075*u)*math.sin(angle), .40+2.1*u,
                    2.5+1.6*u+(3.5-2.0*u)*(1-math.cos(angle))/2)
        f15_patch(m, 'fin_'+side, fin, 24, 32, 0)
        for face in (0,1):
            for name,a,b,v,width,mat in [('livery_fin',.73,.83,.12,.26,9),
                                        ('rudder_line',.04,.95,.36,.005,4)]:
                def marking(u,w):
                    x,y,z = fin(a+(b-a)*u,v+width*w+face*.5)
                    return (x+(.006 if face == 0 else -.006),y,z)
                f15_patch(m, name+'_'+side+'_'+str(face), marking,16,4,mat)

        # Shoulder trapezoid blends into the chine instead of a detached diamond.
        outline = [(sign*1.24, .14, -3.42), (sign*1.66, .39, -3.18),
                   (sign*1.85, -.30, -3.06), (sign*1.33, -.49, -3.35)]
        m.slab('intake_throat_'+side, outline, 2, .04, 4)
        center = [sum(p[k] for p in outline)/4 for k in range(3)]
        outer = [tuple(center[k]+(p[k]-center[k])*1.045-(.025 if k == 2 else 0)
                       for k in range(3)) for p in outline]
        for i in range(4):
            j = (i+1) % 4
            m.slab('intake_lip_'+side+str(i), [outline[i], outline[j], outer[j], outer[i]], 2, .03, 1)
            aft_i = (sign*(1.67+.10*outer[i][1]),outer[i][1]*.82,-.8)
            aft_j = (sign*(1.67+.10*outer[j][1]),outer[j][1]*.82,-.8)
            m.slab('intake_duct_'+side+str(i), [outer[i],outer[j],aft_j,aft_i], 2,.025,0)

        for name,a,b,lo,hi,mat in [('shoulder_access',.48,.62,.04,.12,7),
                                  ('gear_door',.28,.37,.755,.78,1)]:
            def panel(u,v):
                angle = lo+(hi-lo)*v
                if side == 'L':
                    angle = .5-angle if angle < .5 else 1.5-angle
                x,y,z = body(a+(b-a)*u,angle)
                return (x*1.008,y*1.008,z)
            f15_patch(m, name+'_'+side, panel,40 if name == 'bay_door' else 20,8,mat,side == 'R')
        bay = m.node('weapon_bay_'+side, (sign*.72,-.58,.1))
        # Stores are recessed above the closed belly covers. Existing ammo state
        # removes each independently; opening the covers exposes them from below.
        missile(m, 'missile_'+side+'1', (-sign*.19,.43,-.22), bay)
        missile(m, 'missile_'+side+'2', (sign*.19,.43,.28), bay)
        lo, hi = ((.625, .744) if side == 'L' else (.756, .875))
        outer = lo if side == 'L' else hi
        hinge = body(.58, outer)
        door = m.node('bay_door_'+side, hinge)
        def cover(u, v):
            p = body(.4+.36*u, lo+(hi-lo)*v)
            return tuple(p[k]-hinge[k] for k in range(3))
        f15_patch(m, 'bay_door_panel_'+side, cover, 24, 6, 7, True, door)
        # A dark roof and end walls make the opened aperture read as a recess.
        m.box('bay_roof_'+side, (sign*.78,.23,.12), (1.12,.045,4.95), 4)
        for label, u in [('front', .4), ('rear', .76)]:
            def wall(v, w):
                x,y,z = body(u, lo+(hi-lo)*v)
                return (x, y+(.23-y)*w, z)
            f15_patch(m, 'bay_wall_'+side+'_'+label, wall, 6, 2, 4, label == 'front')

        # Narrow conforming seams delineate flush internal weapon-bay doors.
        # These follow the belly skin, not an external pod or hidden filler panel.
        for edge, v in [('inner', hi if side == 'L' else lo), ('outer', outer)]:
            def seam(u, w):
                x, y, z = body(.40+.36*u, v+.0012*(w-.5))
                return (x, y-.014, z)
            f15_patch(m, 'bay_'+side+'_'+edge, seam, 40, 1, 4, True)
        for end, u in [('front', .40), ('rear', .76)]:
            def seam(w, v):
                x, y, z = body(u+.0012*(w-.5), lo+(hi-lo)*v)
                return (x, y-.014, z)
            f15_patch(m, 'bay_'+side+'_'+end, seam, 1, 24, 4, sign > 0)

    def nozzle(u, v):
        angle = math.tau*v
        r = .70-.12*u+.018*math.cos(24*angle)*math.sin(math.pi*u)
        return (r*math.cos(angle), .01+r*.83*math.sin(angle), 6+1.0*u)
    f15_patch(m, 'exhaust_collar', lambda u,v: nozzle(.22*u,v), 4,96,8,True)
    for petal in range(24):
        f15_patch(m, 'exhaust_petal_'+str(petal),
                  lambda u,v: nozzle(.22+.78*u,(petal+v)/24),
                  10,4,3 if petal % 2 else 8,True)

    def inner(u, v):
        angle = math.tau*v
        r = .52+.06*u
        return (r*math.cos(angle), .01+r*.83*math.sin(angle), 6.45+.55*u)
    f15_patch(m, 'nozzle_inner', inner, 4, 96, 4)
    m.loft('exhaust_recess', [(6.42,.52,.4316,0,.01),(6.44,.52,.4316,0,.01)],4,sides=24)
    m.node('exhaust', (0, .01, 7))
    afterburner(m, 'afterburner', (0, .01, 6.95), .49)
    m.node('cockpit', (0, 1.08, -4.1))
    m.node('gun_muzzle', (-.95, .53, -3.0))
    # Verify every authored store vertex lies inside its opening footprint,
    # above the closed cover and below the roof. This is clearance, not visual QA.
    def check_store(node_index, offset=(0, 0, 0)):
        node = m.doc['nodes'][node_index]
        offset = tuple(a+b for a,b in zip(offset, node.get('translation', (0, 0, 0))))
        if 'mesh' in node and node['name'].startswith('missile_'):
            p = m.doc['meshes'][node['mesh']]['primitives'][0]
            a = m.doc['accessors'][p['attributes']['POSITION']]
            view = m.doc['bufferViews'][a['bufferView']]
            flat = struct.unpack_from('<'+'f'*(a['count']*3), m.data, view['byteOffset'])
            for i in range(0, len(flat), 3):
                x,y,z = (flat[i+k]+offset[k] for k in range(3))
                u = (z+8)/14
                radius = body(u, 0)[0]
                c = math.copysign((abs(x)/radius)**(1/.72), x)
                v = 1-math.acos(c)/math.tau
                lo,hi = ((.625,.744) if x < 0 else (.756,.875))
                assert .4 < u < .76 and lo < v < hi, (node['name'], x,y,z)
                assert body(u,v)[1]+.03 < y < .1775, (node['name'], x,y,z)
        for child in node.get('children', []):
            check_store(child, offset)
    check_store(0)
    meter_scale(m, (10.7/10.6, 1, 15.7/15))
    return m


def speedboat():
    """Original deep-V patrol launch. Waterline is Y=0; no reference mesh input.

    Curved hull plating, roof, barrel, stores and twisted prop blades carry the
    tessellation budget. Trim is authored paint, separate from team livery.
    Second finish reroll: approved skin/anchors retained, shared-sample panel
    finishes, edge fittings and local neutral contact AO. Raw and converted
    visual gates remain with the parent; counts do not establish photorealism.
    No images or foam.
    """
    def linear(c):
        c /= 255
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

    # Each finish names a real surface family. Prefix routing below replaces
    # legacy numeric assignments only for this boat; jets retain exact bytes.
    # RGB inputs are sRGB bytes, including metal reflectance and navigation glass.
    palette = [
        ('dry_gelcoat_port', (38, 41, 43), 0, .32, ('hull_L_topsides',)),
        ('dry_gelcoat_starboard', (39, 42, 44), 0, .33, ('hull_R_topsides',)),
        ('cabin_glass', (102, 113, 119), 0, .12, ('windscreen', 'cabin_window_')),
        ('wet_gelcoat', (35, 38, 40), 0, .22, ('hull_',)),
        ('transom_gelcoat', (40, 43, 44), 0, .36, ('transom',)),
        ('foredeck_nonskid', (43, 46, 46), 0, .86, ('foredeck_',)),
        ('aftdeck_nonskid', (41, 44, 44), 0, .89, ('aftdeck_',)),
        ('chine_ochre_enamel', (148, 121, 69), 0, .34, ('chine_',)),
        ('waterline_enamel', (104, 99, 83), 0, .38, ('waterline_',)),
        ('rubrail_epdm', (28, 30, 31), 0, .91, ('rubrail_',)),
        ('sheer_anodized_trim', (44, 47, 48), .05, .48, ('bow_cap_',)),
        ('step_grip', (40, 43, 43), 0, .88, ('foredeck_step',)),
        ('stem_stainless', (170, 175, 178), .9, .24, ('bow_stem',)),
        ('cabin_sill_gelcoat', (42, 45, 46), 0, .37, ('cabin_sill',)),
        ('window_frame_anodized', (120, 125, 127), .78, .31, ('windscreen_post_',)),
        ('cabin_posts_enamel', (40, 43, 44), 0, .35, ('cabin_aft_post_',)),
        ('identification_plate', (137, 113, 67), 0, .49, ('livery_cabin_',)),
        ('stanchion_brushed_steel', (158, 163, 166), .9, .32, ('rail_stanchion_',)),
        ('cleat_cast_steel', (139, 145, 148), .86, .43, ('cleat_base_',)),
        ('cleat_polished_steel', (184, 190, 193), .92, .21, ('cleat_',)),
        ('handrail_chrome', (209, 214, 216), .95, .17, ('handrail_',)),
        ('navigation_mount_rubber', (35, 37, 38), 0, .82, ('nav_mount_',)),
        ('port_signal_lens', (167, 51, 43), 0, .2, ('nav_L',)),
        ('starboard_signal_lens', (55, 126, 78), 0, .21, ('nav_R',)),
        ('stern_signal_lens', (212, 214, 205), 0, .19, ('nav_stern',)),
        ('roof_gelcoat', (36, 39, 40), 0, .43, ('cabin_roof',)),
        ('roof_bright_strip', (46, 49, 50), 0, .38, ('roof_front_trim',)),
        ('console_abs', (38, 41, 43), 0, .73, ('helm_console',)),
        ('instrument_anodized_face', (80, 85, 88), .65, .48, ('helm_instruments',)),
        ('seat_vinyl', (66, 67, 65), 0, .76, ('helm_seat',)),
        ('backrest_vinyl', (70, 71, 68), 0, .79, ('helm_back',)),
        ('mast_stainless', (174, 180, 183), .91, .28, ('stern_light_mast',)),
        ('pedestal_powdercoat', (61, 64, 64), .05, .61, ('cannon_pedestal',)),
        ('yoke_cast_gunmetal', (77, 81, 83), .8, .46, ('cannon_yoke',)),
        ('breech_phosphate', (47, 51, 53), .7, .58, ('cannon_breech',)),
        ('barrel_blued_steel', (66, 71, 75), .88, .29, ('cannon_barrel',)),
        ('muzzle_machined_steel', (121, 127, 131), .92, .27, ('cannon_muzzle_',)),
        ('bore_carbon', (25, 27, 28), .35, .81, ('cannon_bore',)),
        ('rifling_steel', (92, 98, 101), .89, .34, ('rifling_',)),
        ('prop_cast_bronze', (124, 113, 87), .85, .36, ('prop_hub_',)),
        ('prop_polished_bronze', (155, 142, 112), .9, .24, ('prop_blade_',)),
        ('motor_shaft_chrome', (202, 209, 212), .96, .18, ('shaft_',)),
        ('rack_steel', (117, 122, 125), .83, .41, ('rack_rail_',)),
        ('rack_foot_casting', (83, 89, 91), .78, .53, ('rack_foot_',)),
        ('charge_enamel', (77, 80, 73), .12, .56, ('charge_drum_',)),
        ('charge_end_enamel', (70, 74, 69), .1, .62, ('charge_end_',)),
        ('charge_band_zinc', (155, 159, 155), .8, .42, ('charge_band_',)),
        ('hatch_chamfer_aluminum', (58, 61, 62), .25, .64, ('hatch_',)),
        ('vent_recess', (30, 33, 34), 0, .92, ('vent_recess_',)),
        ('vent_louver_aluminum', (100, 106, 108), .82, .44, ('vent_louver_',)),
        ('seat_stitch_polyester', (121, 121, 113), 0, .9, ('seat_stitch_',)),
        ('stanchion_socket', (115, 120, 123), .87, .37, ('rail_socket_',)),
        ('cleat_fastener', (180, 185, 188), .94, .26, ('cleat_bolt_',)),
        ('copper_bonding_strap', (131, 105, 88), .88, .47, ('bonding_strap',)),
        ('brass_drain_plug', (151, 136, 99), .86, .33, ('drain_plug',)),
        ('window_gasket_epdm', (23, 25, 26), 0, .94, ('window_gasket_',)),
        ('vent_rim_powdercoat', (55, 58, 60), .08, .57, ('vent_rim_',)),
        ('seat_piping_vinyl', (82, 83, 78), 0, .68, ('seat_piping_',))]
    m = Model('speedboat', [(n, tuple(linear(c) for c in rgb), metal, rough)
                           for n, rgb, metal, rough, _ in palette])
    m.doc['extensionsUsed'] = ['KHR_materials_clearcoat']
    for material in m.doc['materials']:
        if 'gelcoat' in material['name'] or material['name'] == 'roof_bright_strip':
            material['extensions'] = {'KHR_materials_clearcoat': {
                'clearcoatFactor': .65, 'clearcoatRoughnessFactor': .12}}
    glass = m.doc['materials'][2]
    glass['alphaMode'] = 'BLEND'
    glass['pbrMetallicRoughness']['baseColorFactor'][3] = .48
    m.doc['extras'].update(waterline=0, bodygunPivot=[0, 1.15, -2.6],
                           gunTip=[0, 0, -1.3],
                           stores={'weapons': [[0, 1]],
                                   'order': ['charge_1', 'charge_2', 'charge_3', 'charge_4']})
    stations = [(-5, .025, .66, .12), (-3, 1.05, .58, -.5),
                (0, 1.6, .45, -.7), (3, 1.48, .4, -.64), (5, 1.3, .38, -.55)]

    def section(z):
        a, b = next((a, b) for a, b in zip(stations, stations[1:]) if z <= b[0]+1e-8)
        t = (1-math.cos(math.pi*(z-a[0])/(b[0]-a[0])))/2
        return tuple(a[k]+(b[k]-a[k])*t for k in (1, 2, 3))

    def hull(u, v, sign, upper=False):
        z = -5+10*u
        width, top, keel = section(z)
        chine = max(-.08, keel+.08)
        if upper:
            return (sign*width*(.88+.12*v), chine+(top-chine)*v, z)
        return (sign*width*.88*v, keel+(chine-keel)*v**1.15, z)

    for side, sign in [('L', -1), ('R', 1)]:
        for upper in (False, True):
            f15_patch(m, 'hull_'+side+('_topsides' if upper else '_deadrise'),
                      lambda u,v: hull(u,v,sign,upper), 48, 12, 0, sign > 0)
        for name, v, mat in [('chine', 0, 5), ('waterline', .18, 7), ('rubrail', .95, 4)]:
            def strip(u, w):
                x,y,z = hull(u, v+(.06 if name == 'chine' else .035)*w, sign, True)
                return (x+sign*.012, y, z)
            f15_patch(m, name+'_'+side, strip, 64, 1, mat, sign > 0)
        for name, lo, hi, rise in [('foredeck', -5, -1.3, .16), ('aftdeck', -1.3, 5, 0)]:
            def deck(u,v):
                z = lo+(hi-lo)*u
                width, top, _ = section(z)
                return (sign*width*v, top+rise+.025*(1-v*v), z)
            f15_patch(m, name+'_'+side, deck, 16, 12, 1, sign < 0)
        # A narrow sheer cap joins the raised bow deck to the topsides.
        def bow_cap(u,v):
            z = -5+3.7*u
            width, top, _ = section(z)
            return (sign*width, top+.16*v, z)
        f15_patch(m, 'bow_cap_'+side, bow_cap, 24, 2, 5, sign > 0)
    width, top, keel = section(5)
    m.slab('transom', [(-width,top,4.9875),(width,top,4.9875),(.88*width,-.08,4.9875),
                       (0,keel,4.9875),(-.88*width,-.08,4.9875)], 2, .025, 0)
    width, top, _ = section(-1.3)
    m.box('foredeck_step', (0,top+.08,-1.3), (2*width,.16,.035), 5)
    m.box('bow_stem', (0,.73,-4.99), (.05,.16,.02), 5)

    # Local round rails use the same sampled surface helper as the hull.
    def rail(name, a, b, radius, material=3, parent=0, rows=2, columns=12):
        direction = [b[k]-a[k] for k in range(3)]
        length = math.sqrt(sum(x*x for x in direction))
        d = [x/length for x in direction]
        ref = (0, 1, 0) if abs(d[1]) < .9 else (1, 0, 0)
        n = [d[1]*ref[2]-d[2]*ref[1], d[2]*ref[0]-d[0]*ref[2], d[0]*ref[1]-d[1]*ref[0]]
        norm = math.sqrt(sum(x*x for x in n))
        n = [x/norm for x in n]
        q = [d[1]*n[2]-d[2]*n[1], d[2]*n[0]-d[0]*n[2], d[0]*n[1]-d[1]*n[0]]
        def surface(u,v):
            return tuple(a[k]+direction[k]*u+radius*(n[k]*math.cos(math.tau*v)+
                         q[k]*math.sin(math.tau*v)) for k in range(3))
        f15_patch(m, name, surface, rows, columns, material, True, parent)

    # Low cabin: glazed sloping windscreen, side windows, open aft doorway.
    m.box('cabin_sill', (0,.66,.65), (1.9,.34,2.7), 0)
    m.slab('windscreen', [(-.94,.83,-.7),(.94,.83,-.7),(.77,1.91,-.25),(-.77,1.91,-.25)], 2,.018,2)
    for side, sign in [('L', -1), ('R', 1)]:
        m.slab('cabin_window_'+side, [(sign*.94,.83,-.7),(sign*.77,1.91,-.25),
                                    (sign*.77,1.91,1.85),(sign*.94,.83,2)], 0,.018,2)
        rail('windscreen_post_'+side, (sign*.95,.8,-.72), (sign*.78,1.94,-.25), .035, 5)
        rail('cabin_aft_post_'+side, (sign*.94,.8,2), (sign*.78,1.94,1.85), .04, 0)
        m.box('livery_cabin_'+side, (sign*.958,.68,.5), (.025,.18,.65), 9)
        for i, z in enumerate((-3.4,-1.7,2.35,3.5,4.65)):
            width, top, _ = section(z)
            x = sign*(width-.1)
            rail('rail_stanchion_'+side+str(i), (x,top+.1,z), (x,top+.62,z), .025)
            m.box('cleat_base_'+side+str(i), (x-sign*.1,top+.09,z), (.16,.04,.24), 3)
            rail('cleat_'+side+str(i), (x-sign*.1,top+.16,z-.15),
                 (x-sign*.1,top+.16,z+.15), .028)
        for i, (za,zb) in enumerate(((-3.4,-1.7),(2.35,3.5),(3.5,4.65))):
            wa,ta,_ = section(za)
            wb,tb,_ = section(zb)
            rail('handrail_'+side+str(i), (sign*(wa-.1),ta+.62,za),
                 (sign*(wb-.1),tb+.62,zb), .028)
        m.box('nav_mount_'+side, (sign*.87,1.55,.1), (.12,.08,.25), 4)
        m.loft('nav_'+side, [(-.02,.065,.05,sign*.91,1.6),(.18,.065,.05,sign*.91,1.6)],
               10 if sign < 0 else 11, sides=12)
    def roof(u,v):
        return ((2*v-1)*.83, 1.94+.15*math.sin(math.pi*v), -.32+2.3*u)
    # Roof is straight along U: retain every curved cross-section sample.
    f15_patch(m, 'cabin_roof', roof, 8,20,0)
    rail('roof_front_trim', (-.8,1.96,-.33), (.8,1.96,-.33), .025,5)
    m.box('helm_console', (0,1.02,-.12), (1.1,.55,.38), 4)
    m.box('helm_instruments', (0,1.31,-.12), (.7,.025,.25), 3)
    def cushion(name, center, size, bevel):
        # Eight-corner rings give the upholstery a real highlight-catching edge.
        x,y,z = center
        a,b,c = (v/2 for v in size)
        outline = [(-a+bevel,-c), (a-bevel,-c), (a,-c+bevel), (a,c-bevel),
                   (a-bevel,c), (-a+bevel,c), (-a,c-bevel), (-a,-c+bevel)]
        vertices = [(x+px*scale,y+dy,z+pz*scale)
                    for dy,scale in [(-b,.88),(-b+bevel,1),(b-bevel,1),(b,.88)]
                    for px,pz in outline]
        faces = [list(range(8)),list(range(24,32))]
        faces += [[r*8+i,r*8+(i+1)%8,(r+1)*8+(i+1)%8,(r+1)*8+i]
                  for r in range(3) for i in range(8)]
        m.solid(name,vertices,faces,4)
    cushion('helm_seat', (0,.91,1.05), (.55,.22,.58), .035)
    cushion('helm_back', (0,1.19,1.36), (.55,.65,.12), .025)
    for side in (-1,1):
        rail('seat_piping_'+str(side), (side*.247,1.003,.81),
             (side*.247,1.003,1.29), .009, rows=1,columns=8)
    rail('stern_light_mast', (0,1.94,1.8), (0,2.37,1.8), .022)
    m.box('nav_stern', (0,2.39,1.8), (.08,.08,.08), 12)
    m.node('helm_eye', (0,1.9,.9))
    m.node('stern_exit', (0,.45,5.2))

    yaw = m.node('cannon_yaw', (0,1.0,-2.6))
    m.box('cannon_pedestal', (0,.83,-2.6), (.54,.3,.58), 0)
    m.box('cannon_yoke', (0,.03,0), (.46,.24,.44), 5, yaw)
    pitch = m.node('cannon_pitch', (0,.15,0), yaw)
    m.box('cannon_breech', (0,0,.12), (.3,.27,.48), 0, pitch)
    rail('cannon_barrel', (0,0,-.12), (0,0,-1.3), .065, 3, pitch, 12,24)
    # An open annulus, recessed bore and shallow helical lands, not a black
    # disk painted over a closed muzzle cap. External muzzle dimensions stay put.
    f15_patch(m, 'cannon_muzzle_rim',
              lambda u,v: ((.05+.033*u)*math.cos(math.tau*v),
                           (.05+.033*u)*math.sin(math.tau*v), -1.3), 1,24,3,True,pitch)
    rail('cannon_muzzle_outer', (0,0,-1.3), (0,0,-1.2), .083,3,pitch,1,24)
    f15_patch(m, 'cannon_bore_wall',
              lambda u,v: (.05*math.cos(math.tau*v), .05*math.sin(math.tau*v),
                           -1.3+.18*u), 3,24,4,False,pitch)
    m.loft('cannon_bore_end', [(-1.12,.05,.05,0,0),(-1.119,.05,.05,0,0)],4,pitch,24)
    for land in range(6):
        def rifling(u,v):
            angle = land*math.tau/6+.45*u+.07*v
            return (.049*math.cos(angle), .049*math.sin(angle), -1.295+.17*u)
        f15_patch(m, 'rifling_'+str(land), rifling,8,1,3,False,pitch)
    m.node('gun_muzzle', (0,0,-1.3), pitch)

    for side, sign in [('L', -1), ('R', 1)]:
        prop = m.node('prop_'+side, (sign*.8,-.45,4.4))
        m.loft('prop_hub_'+side, [(-.35,.08,.08,0,0),(.15,.09,.09,0,0),(.25,.025,.025,0,0)],8,prop,24)
        for blade in range(3):
            # Twisted, rounded airfoil with a finite tip, not a spinner-only rig.
            def blade_skin(u,v):
                angle = blade*math.tau/3+.5*u
                radius = .07+.17*u
                chord = (.085-.045*u)*math.cos(math.tau*v)
                return (radius*math.cos(angle)-chord*math.sin(angle),
                        radius*math.sin(angle)+chord*math.cos(angle),
                        .035*u+.018*math.sin(math.tau*v))
            f15_patch(m, 'prop_blade_'+side+str(blade), blade_skin,12,8,8,False,prop)
        rail('shaft_'+side, (sign*.8,-.37,3.75), (sign*.8,-.45,4.25), .045,3)
        m.node('wake_'+side, (sign*.8,-.03,4.9))
        for x in (sign*.43,sign*1.15):
            rail('rack_rail_'+str(x), (x,.68,2.75), (x,.68,4.85), .035,5)
        for z in (2.85,4.75):
            m.box('rack_foot_'+side+str(z), (sign*.79,.52,z), (.85,.22,.09),3)
    for i, (x,z) in enumerate(((-.79,3.3),(.79,3.3),(-.79,4.35),(.79,4.35)),1):
        charge = m.node('charge_'+str(i), (x,.84,z))
        def drum(u,v):
            radius = .18+.035*math.sin(math.pi*u)
            return (radius*math.cos(math.tau*v), radius*math.sin(math.tau*v), -.43+.86*u)
        f15_patch(m, 'charge_drum_'+str(i),drum,12,24,13,True,charge)
        for end in (-.43,.43):
            m.loft('charge_end_'+str(i)+'_'+str(end), [(end-.008,.18,.18,0,0),(end+.008,.18,.18,0,0)],6,charge,24)
        for band in (-.28,.28):
            m.loft('charge_band_'+str(i)+'_'+str(band), [(band-.025,.213,.213,0,0),(band+.025,.213,.213,0,0)],5,charge,24)
    # Small visible fittings, without changing the approved skin or rig.
    for side, sign in [('L', -1), ('R', 1)]:
        for i, z in enumerate((-3.4,-1.7,2.35,3.5,4.65)):
            width, top, _ = section(z)
            x = sign*(width-.1)
            rail('rail_socket_'+side+str(i), (x,top+.1,z),
                 (x,top+.17,z), .042,3,rows=1,columns=8)
            for dz in (-.08,.08):
                m.box('cleat_bolt_'+side+str(i)+str(dz),
                      (x-sign*.1,top+.115,z+dz), (.033,.012,.033),3)
        m.box('vent_recess_'+side, (sign*.956,.68,1.45), (.018,.19,.48),4)
        for i in range(5):
            z = 1.26+i*.095
            m.slab('vent_louver_'+side+str(i),
                   [(sign*.97,.6,z),(sign*.99,.6,z+.026),
                    (sign*.99,.76,z+.026),(sign*.97,.76,z)],0,.008,3)
    # Rubber seals sit just outside the existing glass, not over its center.
    windows = [('front', [(-.94,.83,-.714),(.94,.83,-.714),
                          (.77,1.91,-.264),(-.77,1.91,-.264)])]
    for side,sign in [('L',-1),('R',1)]:
        windows.append((side, [(sign*.954,.83,-.7),(sign*.784,1.91,-.25),
                               (sign*.784,1.91,1.85),(sign*.954,.83,2)]))
        rim = [(sign*.981,.582,1.198),(sign*.981,.778,1.198),
               (sign*.981,.778,1.702),(sign*.981,.582,1.702)]
        for edge in range(4):
            rail('vent_rim_'+side+str(edge),rim[edge],rim[(edge+1)%4],
                 .014,rows=1,columns=8)
    for label,corners in windows:
        for edge in range(4):
            rail('window_gasket_'+label+str(edge),corners[edge],corners[(edge+1)%4],
                 .018,rows=1,columns=8)
    # Chamfered hatch perimeter sits on the curved deck, not floating box trim.
    for edge in range(4):
        corners = [(-.31,2.3),(.31,2.3),(.31,2.8),(-.31,2.8)]
        a, b = corners[edge], corners[(edge+1)%4]
        def hatch(u,v):
            x,z = (a[k]+(b[k]-a[k])*u for k in (0,1))
            width, top, _ = section(z)
            dx,dz = b[0]-a[0], b[1]-a[1]
            length = math.hypot(dx,dz)
            x += -dz/length*(v-.5)*.025
            z += dx/length*(v-.5)*.025
            return (x, top+.025*(1-(x/width)**2)+.006+.008*math.sin(math.pi*v), z)
        f15_patch(m,'hatch_chamfer_'+str(edge),hatch,4,2,3,True)
    for side in (-1,1):
        for stitch in range(12):
            z = .8+stitch*.043
            rail('seat_stitch_'+str(side)+'_'+str(stitch),
                 (side*.24,1.023,z), (side*.24,1.023,z+.024), .003,3,rows=1,columns=4)
    m.box('bonding_strap', (.2,1.155,-2.58), (.026,.09,.12),3)
    m.loft('drain_plug', [(5.001,.032,.032,0,-.39),(5.016,.032,.032,0,-.39)],3,sides=8)

    routes = sorted([(prefix, i) for i, entry in enumerate(palette)
                     for prefix in entry[4]], key=lambda item: -len(item[0]))
    for mesh in m.doc['meshes']:
        material = next(i for prefix, i in routes if mesh['name'].startswith(prefix))
        mesh['primitives'][0]['material'] = material
    # Partition only the index grid. Adjacent plates share the exact original
    # positions and area-weighted normals, including their boundary samples.
    # Long topside plates and deck walkway/center panels are finish zones, not
    # separate floating decals or a checkerboard of unrelated paint colors.
    for mesh in m.doc['meshes']:
        name = mesh['name']
        topside = name.startswith('hull_') and name.endswith('_topsides')
        deck_panel = name.startswith(('foredeck_', 'aftdeck_')) and name != 'foredeck_step'
        if not (topside or deck_panel):
            continue
        p = mesh['primitives'][0]
        a = m.doc['accessors'][p['indices']]
        view = m.doc['bufferViews'][a['bufferView']]
        indices = struct.unpack_from('<'+'H'*a['count'],m.data,view['byteOffset'])
        rows,columns = (48,12) if topside else (16,12)
        groups = [[] for _ in range(4 if topside else 8)]
        for row in range(rows):
            for column in range(columns):
                group = row//(rows//4)
                if deck_panel:
                    group = group*2 + (column >= 9)
                start = (row*columns+column)*6
                groups[group].extend(indices[start:start+6])
        mesh['primitives'] = []
        base = m.doc['materials'][p['material']]
        for zone,indices in enumerate(groups):
            material = p['material']
            if zone:
                finish = json.loads(json.dumps(base))
                finish['name'] = name+'_finish_'+str(zone)
                pbr = finish['pbrMetallicRoughness']
                # Small reflectance differences, stronger differences in wear.
                delta = (0,1,-1,2,-2,1,0,-1)[zone]
                rgb = palette[material][1]
                pbr['baseColorFactor'] = [*(linear(c+delta) for c in rgb),1]
                pbr['roughnessFactor'] = min(.98,pbr['roughnessFactor'] +
                    ((.065 if zone%2 else -.025) + zone*.002 + (.003 if name.endswith('_L') else 0)
                     if deck_panel else (.025,-.025,.04)[zone-1]))
                material = len(m.doc['materials'])
                m.doc['materials'].append(finish)
            mesh['primitives'].append({**p,'indices':m.accessor(indices,1,True),
                                       'material':material})
    bake_boat_occlusion(m)
    return m


def bake_boat_occlusion(m):
    """Neutral COLOR_0 multipliers, never a second copy of the base color.

    Fixed-seed panel variation and nearby-solid contact heuristics.
    Bounds come from geometry in model space, including articulated parents.
    This is approximate ambient occlusion, not a ray-traced light bake.
    """
    import random
    rng = random.Random(232)
    offsets = {}
    def visit(index, offset=(0,0,0)):
        node = m.doc['nodes'][index]
        offset = tuple(a+b for a,b in zip(offset,node.get('translation',(0,0,0))))
        if 'mesh' in node:
            offsets[node['mesh']] = offset
        for child in node.get('children',[]):
            visit(child,offset)
    visit(0)

    def attribute(primitive, name):
        a = m.doc['accessors'][primitive['attributes'][name]]
        view = m.doc['bufferViews'][a['bufferView']]
        flat = struct.unpack_from('<'+'f'*(a['count']*3),m.data,view['byteOffset'])
        return list(zip(flat[::3],flat[1::3],flat[2::3]))

    occluders = []
    for i,mesh in enumerate(m.doc['meshes']):
        if mesh['name'] in ('cabin_roof','cabin_sill','helm_console','helm_seat',
                            'cannon_breech','cannon_yoke') or mesh['name'].startswith('charge_drum_'):
            points = attribute(mesh['primitives'][0],'POSITION')
            low = [min(p[k] for p in points)+offsets[i][k] for k in range(3)]
            high = [max(p[k] for p in points)+offsets[i][k] for k in range(3)]
            occluders.append((i,low,high))
    for i,mesh in enumerate(m.doc['meshes']):
        p = mesh['primitives'][0]
        positions = attribute(p,'POSITION')
        panel = rng.uniform(.985,1)
        colors = []
        for local in positions:
            x,y,z = [local[k]+offsets[i][k] for k in range(3)]
            # A downward-facing surface is not inherently occluded. Keep open
            # hull plating neutral; local fittings provide the contact darkening.
            shade = 1.
            for other,low,high in occluders:
                if other == i:
                    continue
                # Expanded footprint softens contact edges; overhead slabs shade
                # the deck and seat, nearby housings shade their actual crevices.
                dx = max(low[0]-x,0,x-high[0])
                dz = max(low[2]-z,0,z-high[2])
                gap = low[1]-y
                if -.025 <= gap < .45:
                    footprint = max(0,1-math.hypot(dx,dz)/.12)
                    shade -= .28*footprint*(1-max(0,gap)/.45)
            shade = max(.55,min(1,shade*panel))
            colors.extend((shade,shade,shade))
        p['attributes']['COLOR_0'] = m.accessor(colors,3)


def check_model(data):
    """Validate serialized geometry, including bounds, winding and hard budgets."""
    assert struct.unpack_from('<4sII', data) == (b'glTF', 2, len(data))
    length, kind = struct.unpack_from('<I4s', data, 12)
    assert kind == b'JSON' and length % 4 == 0
    doc = json.loads(data[20:20+length])
    size, kind = struct.unpack_from('<I4s', data, 20+length)
    binary = data[28+length:]
    assert kind == b'BIN\0' and size % 4 == 0
    assert len(doc['buffers']) == 1
    assert size == len(binary) == doc['buffers'][0]['byteLength']
    assert 'uri' not in doc['buffers'][0]
    assert not doc.get('extensionsRequired')

    def local_only(value):
        if isinstance(value, dict):
            assert not any(k == 'uri' or k.endswith('Texture') for k in value)
            for item in value.values():
                local_only(item)
        elif isinstance(value, list):
            for item in value:
                local_only(item)
    local_only(doc)
    assert doc['extras']['forward'] == '-Z' and doc['extras']['up'] == '+Y'
    assert doc['scene'] == 0 and doc['scenes'] == [{'nodes': [0]}]
    nodes = doc['nodes']
    name = nodes[0]['name']
    assert name in ('f15', 'f35', 'speedboat')
    names = [n['name'] for n in nodes]
    assert len(names) == len(set(names))
    assert not {'gear', 'propeller'} & set(names)
    visited = set()

    mesh_offsets = {}

    def visit(i, parent_offset=(0, 0, 0)):
        assert 0 <= i < len(nodes) and i not in visited, 'invalid node tree'
        visited.add(i)
        node = nodes[i]
        offset = tuple(a+b for a,b in zip(parent_offset, node.get('translation', (0, 0, 0))))
        assert not any(k in node for k in ('matrix', 'rotation', 'scale', 'skin'))
        assert all(math.isfinite(x) for x in node.get('translation', []))
        if 'mesh' in node:
            assert 0 <= node['mesh'] < len(doc['meshes'])
            mesh_offsets[node['mesh']] = offset
        for child in node.get('children', []):
            visit(child, offset)
    visit(0)
    assert len(visited) == len(nodes)
    assert sorted(n['mesh'] for n in nodes if 'mesh' in n) == list(range(len(doc['meshes'])))
    for view in doc['bufferViews']:
        assert view['buffer'] == 0 and view['byteOffset'] >= 0
        assert view['byteOffset'] % 4 == 0 and view['byteLength'] > 0
        assert view['byteOffset'] + view['byteLength'] <= len(binary)
        assert 'byteStride' not in view

    def values(index):
        assert 0 <= index < len(doc['accessors'])
        a = doc['accessors'][index]
        assert 0 <= a['bufferView'] < len(doc['bufferViews'])
        view = doc['bufferViews'][a['bufferView']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        fmt = {5123: 'H', 5126: 'f'}[a['componentType']]
        assert a['count'] > 0 and not a.get('sparse')
        assert a.get('byteOffset', 0) == 0
        assert view['byteLength'] == a['count'] * width * struct.calcsize(fmt)
        flat = struct.unpack_from('<'+fmt*(a['count']*width), binary, view['byteOffset'])
        assert all(math.isfinite(x) for x in flat)
        if 'min' in a:
            for k in range(width):
                assert abs(a['min'][k] - min(flat[k::width])) < 1e-5
                assert abs(a['max'][k] - max(flat[k::width])) < 1e-5
        return [flat[i:i+width] for i in range(0, len(flat), width)]

    for i in range(len(doc['accessors'])):
        values(i)
    triangles = vertices = 0
    seen = set()
    for mesh_index, mesh in enumerate(doc['meshes']):
        for p in mesh['primitives']:
            assert p['mode'] == 4 and 'targets' not in p
            for attr, width in [('POSITION', 'VEC3'), ('NORMAL', 'VEC3'), ('TEXCOORD_0', 'VEC2')]:
                accessor = doc['accessors'][p['attributes'][attr]]
                assert accessor['type'] == width and accessor['componentType'] == 5126
            accessor = doc['accessors'][p['indices']]
            assert accessor['type'] == 'SCALAR' and accessor['componentType'] == 5123
            positions = values(p['attributes']['POSITION'])
            normals = values(p['attributes']['NORMAL'])
            uv = values(p['attributes']['TEXCOORD_0'])
            indices = [v[0] for v in values(p['indices'])]
            assert len(positions) == len(normals) == len(uv)
            if name == 'speedboat':
                color = doc['accessors'][p['attributes']['COLOR_0']]
                assert color['type'] == 'VEC3' and color['componentType'] == 5126
                colors = values(p['attributes']['COLOR_0'])
                assert len(colors) == len(positions), mesh['name']
                assert all(0 <= c <= 1 for rgb in colors for c in rgb)
                assert all(rgb[0] == rgb[1] == rgb[2] for rgb in colors), 'AO must be neutral'
            assert len(indices) % 3 == 0 and max(indices) < len(positions)
            assert all(abs(sum(x*x for x in n)-1) < 1e-5 for n in normals)
            vertices += len(positions)
            for i in range(0, len(indices), 3):
                ids = indices[i:i+3]
                a, b, c = [positions[k] for k in ids]
                u, v = [b[k]-a[k] for k in range(3)], [c[k]-a[k] for k in range(3)]
                n = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
                assert sum(x*x for x in n) > 1e-18, mesh['name']
                assert sum(n[k]*sum(normals[j][k] for j in ids) for k in range(3)) > 0, mesh['name']
                # Repeated local store geometry is valid at distinct world positions.
                offset = mesh_offsets[mesh_index]
                key = tuple(sorted(tuple(p[k]+offset[k] for k in range(3)) for p in (a, b, c)))
                assert key not in seen, mesh['name']
                seen.add(key)
                triangles += 1
    if name == 'speedboat':
        assert 12_000 <= triangles <= 18_000, triangles
    else:
        assert (40_000 <= triangles <= 55_000 if name == 'f15' else 35_000 <= triangles <= 50_000), triangles
    assert len(data) < 1_200_000, len(data)
    assert not any(k in doc['nodes'][0] for k in ('matrix', 'translation', 'rotation', 'scale'))
    if name == 'speedboat':
        required = {'cannon_yaw', 'cannon_pitch', 'gun_muzzle', 'helm_eye', 'stern_exit',
                    'prop_L', 'prop_R', 'wake_L', 'wake_R',
                    'charge_1', 'charge_2', 'charge_3', 'charge_4'}
        assert required <= set(names)
        expected = {'cannon_yaw': (0,1,-2.6), 'cannon_pitch': (0,.15,0),
                    'gun_muzzle': (0,0,-1.3), 'helm_eye': (0,1.9,.9),
                    'stern_exit': (0,.45,5.2), 'prop_L': (-.8,-.45,4.4),
                    'prop_R': (.8,-.45,4.4), 'wake_L': (-.8,-.03,4.9),
                    'wake_R': (.8,-.03,4.9)}
        for label, position in expected.items():
            assert nodes[names.index(label)]['translation'] == list(position), label
        assert names.index('cannon_pitch') in nodes[names.index('cannon_yaw')]['children']
        assert names.index('gun_muzzle') in nodes[names.index('cannon_pitch')]['children']
        def carries_mesh(index):
            return 'mesh' in nodes[index] or any(carries_mesh(c) for c in nodes[index].get('children', []))
        for label in required - {'gun_muzzle', 'helm_eye', 'stern_exit', 'wake_L', 'wake_R'}:
            assert carries_mesh(names.index(label)), label
        assert len({tuple(mat['pbrMetallicRoughness']['baseColorFactor'][:3])
                    for mat in doc['materials']}) >= 10
        assert doc['extras']['waterline'] == 0
        assert doc['extras']['bodygunPivot'] == [0,1.15,-2.6]
        assert doc['extras']['gunTip'] == [0,0,-1.3]
        assert doc['extras']['stores'] == {'weapons': [[0,1]],
                                          'order': ['charge_1','charge_2','charge_3','charge_4']}
        hull_points = []
        for mesh in doc['meshes']:
            topside = mesh['name'].startswith('hull_') and mesh['name'].endswith('_topsides')
            deck_panel = mesh['name'].startswith(('foredeck_', 'aftdeck_')) and mesh['name'] != 'foredeck_step'
            if topside or deck_panel:
                patches = mesh['primitives']
                assert len(patches) == (4 if topside else 8), mesh['name']
                assert all(p['attributes'] == patches[0]['attributes'] for p in patches)
                assert len({p['material'] for p in patches}) == len(patches)
                assert sum(doc['accessors'][p['indices']]['count'] for p in patches) == (48 if topside else 16)*12*6
            if mesh['name'].startswith('hull_'):
                p = mesh['primitives'][0]
                hull_points.extend(values(p['attributes']['POSITION']))
                sign = -1 if mesh['name'].startswith('hull_L') else 1
                assert all(n[0]*sign > 0 for n in values(p['attributes']['NORMAL']))
        for axis, low, high in [(0,-1.6,1.6),(1,-.7,.66),(2,-5,5)]:
            assert abs(min(p[axis] for p in hull_points)-low) < 1e-5
            assert abs(max(p[axis] for p in hull_points)-high) < 1e-5
        for side in ('L','R'):
            assert all('prop_blade_'+side+str(i) in names for i in range(3))
        barrel = doc['meshes'][nodes[names.index('cannon_barrel')]['mesh']]['primitives'][0]
        assert abs(min(p[2] for p in values(barrel['attributes']['POSITION']))+1.3) < 1e-5
    else:
        assert {'cockpit', 'gun_muzzle', 'wing_L', 'wing_R', 'stabilizer_L', 'stabilizer_R'} <= {n['name'] for n in doc['nodes']}
    assert not any(doc.get(k) for k in ('textures', 'images', 'skins', 'animations'))
    assignments = [p['material'] for mesh in doc['meshes'] for p in mesh['primitives']]
    assert len(assignments) >= 40 and set(assignments) == set(range(len(doc['materials'])))
    glass = [m for m in doc['materials'] if m.get('alphaMode') == 'BLEND']
    assert len(glass) == 1 and 0 < glass[0]['pbrMetallicRoughness']['baseColorFactor'][3] < 1
    assert all(m in glass or m['pbrMetallicRoughness']['baseColorFactor'][3] == 1
               for m in doc['materials'])
    unique = {json.dumps({k: v for k, v in m.items() if k != 'name'}, sort_keys=True)
              for m in doc['materials']}
    if name == 'speedboat':
        assert len(unique) == len(doc['materials']) >= 40
        assert len(assignments) >= 121
        assert doc['extensionsUsed'] == ['KHR_materials_clearcoat']
    return {'name': name, 'triangles': triangles, 'vertices': vertices,
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'assignments': len(assignments), 'materials': len(doc['materials']),
            'unique_materials': len(unique)}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--speedboat', action='store_true', help='Generate only the experimental boat under .tmp')
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[3] / '.tmp/wings-speedboat-model/reroll2' if args.speedboat else OUT
    output.mkdir(parents=True, exist_ok=True)
    for make in ((speedboat,) if args.speedboat else (f15, f35)):
        data = make().finish()
        result = check_model(data)
        assert data == make().finish(), 'Generation must be deterministic'
        path = output / (result['name'] + '.glb')
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)
        print(json.dumps(result, sort_keys=True))
