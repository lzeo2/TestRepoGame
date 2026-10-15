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
        ('canopy_opaque', (.065, .075, .085), .25, .3),
        ('nozzle_metal', (.19, .20, .21), .55, .65),
        ('intake_shadow', (.035, .038, .04), 0, .95)])

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

    f15_patch(m, 'fuselage', body, 128, 64, 0, True)

    # Bubble canopy is only the exposed upper shell; no hidden bottom hemisphere.
    def canopy(u, v):
        z = -6.7 + 4.1*u
        width = .025 + .52 * math.sin(math.pi*u)**.65
        height = .035 + .60 * math.sin(math.pi*u)**.8
        return (width*math.cos(math.pi*v), .57+height*math.sin(math.pi*v), z)

    f15_patch(m, 'canopy', canopy, 64, 24, 2, True)

    for side, sign in [('L', -1), ('R', 1)]:
        # Broad shoulder-mounted swept wing with a rounded airfoil, tapered tips.
        # Angular sampling resolves both leading-edge curvature and trailing edge.
        def wing(u, v):
            chord = 5.3 - 3.7*u
            angle = math.tau*v
            return (sign*(1.18+5.32*u), .23-.12*u + (.16-.13*u)*math.sin(angle),
                    -2.8+4.35*u + chord*(1-math.cos(angle))/2)

        f15_patch(m, 'wing_'+side, wing, 32, 48, 0, sign > 0)

        def stabilizer(u, v):
            angle = math.tau*v
            return (sign*(1.15+2.8*u), -.12-.18*u + (.10-.08*u)*math.sin(angle),
                    4.1+2.25*u + (3.5-2.1*u)*(1-math.cos(angle))/2)

        f15_patch(m, 'stabilizer_'+side, stabilizer, 20, 32, 1, sign > 0)

        # Upright, widely separated twin vertical tails, not stealth-style cant.
        def fin(u, v):
            angle = math.tau*v
            return (sign*1.40 + (.10-.075*u)*math.sin(angle), .46+3.0*u,
                    2.8+2.05*u + (4.5-2.65*u)*(1-math.cos(angle))/2)

        f15_patch(m, 'fin_'+side, fin, 20, 32, 0)

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

        f15_patch(m, 'engine_'+side, engine, 80, 48, 0, True)
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

        f15_patch(m, 'nozzle_'+side, nozzle, 12, 60, 3, True)
        def nozzle_inside(u, v):
            angle = math.tau*v
            radius = .48+.03*u
            return (sign*1.30+radius*math.cos(angle), -.16+radius*math.sin(angle), 7.8+.65*u)
        f15_patch(m, 'nozzle_inner_'+side, nozzle_inside, 4, 60, 4)
        m.node('exhaust_'+side, (sign*1.30, -.16, 8.45))
    m.node('cockpit', (0, 1.05, -4.9))
    m.node('gun_muzzle', (1.03, .27, -3.9))
    return m


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
    data = f15().finish()
    triangles, vertices = check_f15(data)
    assert data == f15().finish(), 'F-15 generation must be deterministic'
    path = OUT / 'f15.glb'
    path.write_bytes(data)
    print(path.name, 'triangles', triangles, 'vertices', vertices,
          'bytes', len(data), 'sha256', hashlib.sha256(data).hexdigest())
