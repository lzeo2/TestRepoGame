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
        positions, normals, uv = [], [], []
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
                    positions.extend(p)
                    normals.extend(x / length for x in n)
                    uv.extend((p[0] / 20 + .5, p[2] / 20 + .5))
        primitive = {'attributes': {'POSITION': self.accessor(positions, 3),
                                   'NORMAL': self.accessor(normals, 3),
                                   'TEXCOORD_0': self.accessor(uv, 2)},
                     'indices': self.accessor(list(range(len(positions) // 3)), 1, True),
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


def interceptor():
    m = Model('astra-interceptor', [
        ('paint', (.34,.42,.50), .15,.72), ('belly', (.60,.65,.68), .1,.8),
        ('canopy_opaque', (.035,.085,.12), .35,.3), ('dark_metal', (.07,.08,.09), .6,.65),
        ('accent', (.9,.24,.045), .05,.7)])
    m.loft('fuselage', [(-9,.045,.045,0,0),(-5,.65,.65,0,0),(-1,.95,.8,0,0),
                          (4,.85,.65,0,0),(8,.5,.4,0,.1)], 0)
    m.loft('canopy', [(-5,.15,.1,0,.55),(-3,.52,.65,0,.75),(-.8,.42,.42,0,.7)], 2)
    for side, sign in [('L',-1), ('R',1)]:
        m.slab('wing_'+side, [(sign*.6,-.05,-3),(sign*6,-.05,3.4),
                              (sign*5.8,-.05,4.7),(sign*.7,-.05,3)], 1,.18,0)
        m.slab('livery_wing_'+side, [(sign*4.8,.055,2.2),(sign*5.5,.055,3.05),
                                     (sign*5.35,.055,4.35),(sign*4.6,.055,4.15)], 1,.02,4)
        m.slab('stabilizer_'+side, [(sign*.4,.3,5.3),(sign*3.3,.3,7),
                                    (sign*3.1,.3,8),(sign*.5,.3,7.4)], 1,.12,1)
        x = sign*.72
        m.slab('fin_'+side, [(x,.2,4),(x+sign*.35,2.9,6.5),
                              (x+sign*.3,2.7,7.7),(x,.3,7.8)], 0,.14,0)
        m.loft('intake_'+side, [(-2,.38,.45,sign*1,-.2),(1,.43,.5,sign*.9,-.15)], 3)
        m.loft('exhaust_'+side, [(6.6,.36,.35,sign*.53,0),(8.15,.32,.3,sign*.53,0)], 3)
    m.node('gun_muzzle', (0,-.25,-8))
    m.node('cockpit', (0,1.35,-3))
    return m


def trainer():
    m = Model('astra-trainer', [
        ('cream_paint', (.83,.76,.53), .05,.82), ('orange_paint', (.91,.29,.045), .05,.75),
        ('canopy_opaque', (.045,.11,.15), .25,.35), ('rubber', (.045,.05,.055), 0,.95),
        ('metal', (.34,.37,.39), .55,.65)])
    m.loft('fuselage', [(-4,.7,.65,0,0),(-2,.95,.95,0,0),(.5,.85,.85,0,.05),
                          (4.3,.2,.25,0,.25)], 0)
    m.loft('cowling', [(-4.55,.55,.55,0,0),(-3.8,.75,.7,0,0)], 1)
    m.loft('canopy', [(-2,.45,.2,0,.75),(-1.6,.62,.6,0,.9),(.5,.55,.55,0,.8),(1,.25,.15,0,.7)], 2)
    for side, sign in [('L',-1), ('R',1)]:
        m.slab('wing_'+side, [(sign*.5,.65,-1.5),(sign*5.5,.65,-1.1),
                              (sign*5.6,.65,.7),(sign*.5,.65,1)], 1,.22,0)
        m.slab('livery_wing_'+side, [(sign*4.7,.77,-1.17),(sign*5.5,.77,-1.1),
                                     (sign*5.6,.77,.7),(sign*4.7,.77,.75)], 1,.025,1)
        m.slab('stabilizer_'+side, [(sign*.1,.35,2.8),(sign*2.2,.35,3),
                                    (sign*2.2,.35,4.2),(sign*.15,.35,4.25)], 1,.12,1)
    m.slab('fin', [(0,.35,2.2),(0,2.25,3.5),(0,2.25,4.25),(0,.35,4.3)], 0,.16,1)
    prop = m.node('propeller', (0,0,-4.7))
    m.box('propeller_blade', (0,0,0), (.22,3.5,.12), 3, prop)
    for y in (-1.55,1.55):
        m.box('prop_tip_'+str(y), (0,y,-.005), (.24,.35,.14), 1, prop)
    m.loft('spinner', [(-.55,.045,.045,0,0),(0,.3,.3,0,0)], 4, prop)
    gear = m.node('gear')
    m.box('gear_crossbar', (0,-.6,-.6), (2.4,.15,.2), 4, gear)
    for x in (-1.15,1.15):
        m.box('strut_'+str(x), (x,-1.1,-.6), (.13,1.3,.15), 4, gear)
        m.box('wheel_'+str(x), (x,-1.7,-.6), (.26,.65,.65), 3, gear)
    m.box('tailwheel', (0,-.25,3.5), (.18,.4,.4), 3, gear)
    m.node('gun_muzzle', (0,-.6,-4.2))
    m.node('cockpit', (0,1.35,-.65))
    return m


def f15_patch(m, name, surface, rows, columns, material, reverse=False):
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
    node = m.node(name)
    m.doc['nodes'][node]['mesh'] = len(m.doc['meshes'])
    m.doc['meshes'].append({'name': name, 'primitives': [primitive]})


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

        f15_patch(m, 'wing_'+side, wing, 32, 48, 0, sign > 0)
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

        f15_patch(m, 'engine_'+side, engine, 64, 40, 0, True)
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
    m.loft('pitot', [(-10.05,.008,.008,0,-.12),(-9.55,.022,.022,0,-.12)], 8, sides=8)
    m.slab('antenna_spine', [(0,.64,-1.6),(0,1.02,-1.15),(0,.64,-.9)], 0,.045,7)
    m.node('weapon_centerline', (0,-.57,.4))
    m.node('cockpit', (0, 1.05, -4.9))
    m.node('gun_muzzle', (1.03, .27, -3.9))
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
    stations = [(-8.0, .018, .025, -.08), (-6.4, .48, .38, -.03),
                (-4.5, .95, .67, .02), (-2.5, 1.62, .82, .02),
                (0, 1.85, .79, 0), (2.5, 1.60, .68, 0),
                (4.8, 1.04, .58, .01), (6.0, .70, .58, .01)]

    def body(u, v):
        z = -8 + 14*u
        a, b = next((a, b) for a, b in zip(stations, stations[1:]) if z <= b[0]+1e-8)
        t = (1-math.cos(math.pi*(z-a[0])/(b[0]-a[0])))/2
        rx, ry, cy = [a[k]+(b[k]-a[k])*t for k in (1, 2, 3)]
        c, s = math.cos(math.tau*v), math.sin(math.tau*v)
        return (rx*math.copysign(abs(c)**.72, c),
                cy+ry*math.copysign(abs(s)**.85, s), z)

    # Omit the upper skin inside the cockpit, rather than glazing over solid skin.
    start, end = 2.2/14, 5.6/14
    for name, a, b, rows, mat in [('radome', 0, start, 20, 6),
                                 ('cockpit_skin', start, end, 32, 0),
                                 ('fuselage', end, 1, 76, 0)]:
        for part, lo, hi, cols, material in [('belly', .5, 1, 32, 5),
                                           ('right', 0, .16, 10, mat),
                                           ('left', .34, .5, 10, mat),
                                           ('top', .16, .34, 12, mat)]:
            if name == 'cockpit_skin' and part == 'top':
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

        # Old inner lip (x=.83,z=-3.12) lay inside the broad body (rx>1.4).
        # Move the whole diamond ahead/outboard of the skin; taper a duct back
        # into the shoulder instead of leaving a flat intersecting mouth.
        outline = [(sign*1.42, .08, -3.70), (sign*1.88, .57, -3.52),
                   (sign*2.38, .02, -3.38), (sign*1.91, -.48, -3.56)]
        m.slab('intake_throat_'+side, outline, 2, .04, 4)
        center = [sum(p[k] for p in outline)/4 for k in range(3)]
        outer = [tuple(center[k]+(p[k]-center[k])*1.10-(.045 if k == 2 else 0)
                       for k in range(3)) for p in outline]
        for i in range(4):
            j = (i+1) % 4
            m.slab('intake_lip_'+side+str(i), [outline[i], outline[j], outer[j], outer[i]], 2, .03, 1)
            aft_i = (outer[i][0]-sign*.42,outer[i][1]*.82,-.8)
            aft_j = (outer[j][0]-sign*.42,outer[j][1]*.82,-.8)
            m.slab('intake_duct_'+side+str(i), [outer[i],outer[j],aft_j,aft_i], 2,.025,0)

        for name,a,b,lo,hi,mat in [('shoulder_access',.48,.62,.04,.12,7),
                                  ('bay_door',.402,.758,.776,.854,7),
                                  ('gear_door',.28,.37,.755,.78,1)]:
            def panel(u,v):
                angle = lo+(hi-lo)*v
                if side == 'L':
                    angle = .5-angle if angle < .5 else 1.5-angle
                x,y,z = body(a+(b-a)*u,angle)
                return (x*1.008,y*1.008,z)
            f15_patch(m, name+'_'+side, panel,40 if name == 'bay_door' else 20,8,mat,side == 'R')
        m.node('weapon_bay_'+side, (sign*.72,-.58,.1))

        # Narrow conforming seams delineate flush internal weapon-bay doors.
        # These follow the belly skin, not an external pod or hidden filler panel.
        for edge, v in [('inner', .75+sign*.025), ('outer', .75+sign*.105)]:
            def seam(u, w):
                x, y, z = body(.40+.36*u, v+.0012*(w-.5))
                return (x, y-.014, z)
            f15_patch(m, 'bay_'+side+'_'+edge, seam, 40, 1, 4, True)
        for end, u in [('front', .40), ('rear', .76)]:
            def seam(w, v):
                x, y, z = body(u+.0012*(w-.5), .75+sign*(.025+.08*v))
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
                  12,4,3 if petal % 2 else 8,True)

    def inner(u, v):
        angle = math.tau*v
        r = .52+.06*u
        return (r*math.cos(angle), .01+r*.83*math.sin(angle), 6.45+.55*u)
    f15_patch(m, 'nozzle_inner', inner, 4, 96, 4)
    m.loft('exhaust_recess', [(6.42,.52,.4316,0,.01),(6.44,.52,.4316,0,.01)],4,sides=24)
    m.node('exhaust', (0, .01, 7))
    m.node('cockpit', (0, 1.08, -4.1))
    m.node('gun_muzzle', (-.95, .53, -3.0))
    return m


def check_f35(data, f15_model=False):
    """Validate serialized float32 geometry, including winding and exact budgets."""
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+length])
    binary = data[28+length:]

    def values(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        fmt = 'H' if a['componentType'] == 5123 else 'f'
        flat = struct.unpack_from('<'+fmt*(a['count']*width), binary, view['byteOffset'])
        assert all(math.isfinite(x) for x in flat)
        return [flat[i:i+width] for i in range(0, len(flat), width)]

    triangles = vertices = 0
    seen = set()
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            assert p['mode'] == 4
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
                key = tuple(sorted((a, b, c)))
                assert key not in seen, mesh['name']
                seen.add(key)
                triangles += 1
    assert (40_000 <= triangles <= 55_000 if f15_model else 35_000 <= triangles <= 50_000), triangles
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
    return triangles, vertices


def check_f15(data):
    """Check the actual serialized descriptors, not a requested subdivision count."""
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+length])
    triangles = vertices = 0
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            assert p['mode'] == 4
            count = doc['accessors'][p['indices']]['count']
            assert count % 3 == 0
            triangles += count // 3
            vertices += doc['accessors'][p['attributes']['POSITION']]['count']
            assert {'POSITION', 'NORMAL', 'TEXCOORD_0'} <= p['attributes'].keys()
    assert 40_000 <= triangles <= 55_000, triangles
    assert len(data) < 1_200_000, len(data)
    return triangles, vertices


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for make in (interceptor, trainer):
        model = make()
        path = OUT / (model.doc['nodes'][0]['name'] + '.glb')
        data = model.finish()
        assert len(data) <= 200_000
        path.write_bytes(data)
        print(path.name, len(data), hashlib.sha256(data).hexdigest())
    data = f35().finish()
    triangles, vertices = check_f35(data)
    assert data == f35().finish(), 'F-35 generation must be deterministic'
    (OUT / 'f35.glb').write_bytes(data)
    print('f35.glb', 'triangles', triangles, 'vertices', vertices,
          'bytes', len(data), 'sha256', hashlib.sha256(data).hexdigest())
    data = f15().finish()
    triangles, vertices = check_f15(data)
    assert check_f35(data, f15_model=True) == (triangles, vertices)
    doc = json.loads(data[20:20+struct.unpack_from('<I', data, 12)[0]])
    assignments = [p['material'] for mesh in doc['meshes'] for p in mesh['primitives']]
    assert len(assignments) >= 40 and set(assignments) == set(range(len(doc['materials'])))
    assert any(m.get('alphaMode') == 'BLEND' for m in doc['materials'])
    print('f15 materials:', len(assignments), 'assignments;', len(doc['materials']), 'definitions')
    assert data == f15().finish(), 'F-15 generation must be deterministic'
    path = OUT / 'f15.glb'
    path.write_bytes(data)
    print(path.name, 'triangles', triangles, 'vertices', vertices,
          'bytes', len(data), 'sha256', hashlib.sha256(data).hexdigest())
