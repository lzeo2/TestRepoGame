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


def check_model(data):
    """Validate the serialized jet, including bounds, winding and hard budgets."""
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
    assert name in ('f15', 'f35')
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
    assert (40_000 <= triangles <= 55_000 if name == 'f15' else 35_000 <= triangles <= 50_000), triangles
    assert len(data) < 1_200_000, len(data)
    assert not any(k in doc['nodes'][0] for k in ('matrix', 'translation', 'rotation', 'scale'))
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
    return {'name': name, 'triangles': triangles, 'vertices': vertices,
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'assignments': len(assignments), 'materials': len(doc['materials']),
            'unique_materials': len(unique)}


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for make in (f15, f35):
        data = make().finish()
        result = check_model(data)
        assert data == make().finish(), 'Generation must be deterministic'
        path = OUT / (result['name'] + '.glb')
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)
        print(json.dumps(result, sort_keys=True))
