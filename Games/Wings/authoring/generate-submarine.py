#!/usr/bin/env python3
"""Original generic Wings submarine, Python stdlib only; no imported art/code.

python3 -B Games/Wings/authoring/generate-submarine.py          # owned outputs
python3 -B Games/Wings/authoring/generate-submarine.py --check  # no writes
Asset articulation is not a simulation capability or runtime registration.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
MODEL = 'models/derived/generic-attack-submarine.glb'
DESCRIPTOR = 'authoring/submarine-model.json'
CENTER_Y = -3.6
PROFILE = [(-42, 0), (-41.3, 1.3), (-39, 2.75), (-35, 4.05),
           (-29, 4.65), (-20, 4.8), (0, 4.8), (16, 4.55),
           (24, 3.7), (30, 2.3), (34, 1.0), (36, .52), (37, .45)]
# Immutable pre-task originals, not inputs to geometry generation.
ORIGINALS = {
    'a10.glb': 'f9f4392f4de4dea95558c16738ff02fd89ae1ca10d0d960655fb967df64b9d24',
    'ac130.glb': '1a53da510144bbcd28903ad407c067e4128af7d7a52afe4994e17826344f1f9e',
    'apache.glb': 'bd6a9677f8f469dceac601aef4fd2ec7b5a42f66f12c5493159004bfa6ca47ac',
    'b2.glb': '3e271a320ef39720c445ed379b72dcdf40b32c38b58d1df09d356be119ee826b',
    'carrier.glb': 'd1e20c4d0a6e13e4de6d1ec0ebbf1cd4ce7a563f2a14601c681b2159822ce9b0',
    'destroyer.glb': '5dfb334aa4496edb0c6358cdf7f8025f71dca563daad2b425d792b41c279eeef',
    'f15.glb': '5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf',
    'f35.glb': 'ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197',
    'fa18.glb': '78bb2fb9f542daaa607e850f7444018fc2f996cd247d67e3ad3761df58efab09',
    'speedboat.glb': '7fee0b74e7c746a2dff2b7c4b5bed58c39b9ddbbc0c55592f1eb27941b4f2aee',
    'yf12.glb': '5f49376fbace30d888e6972850833af28d101427f66f12bdf128c889966f6769',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def sub(a, b):
    return tuple(x-y for x, y in zip(a, b))


def unit(v):
    length = math.sqrt(sum(x*x for x in v))
    assert length > 1e-12
    return [x/length for x in v]


def bounds(points):
    return {k: [fun(p[j] for p in points) for j in range(3)]
            for k, fun in [('min', min), ('max', max)]}


def rotate(q, p):
    a = cross(q[:3], p)
    b = cross(q[:3], a)
    return [p[j]+2*(q[3]*a[j]+b[j]) for j in range(3)]


def quat(axis, angle):
    return [x*math.sin(angle/2) for x in axis]+[math.cos(angle/2)]


def qmul(a, b):
    c = cross(a[:3], b[:3])
    return [a[3]*b[j]+b[3]*a[j]+c[j] for j in range(3)]+[
        a[3]*b[3]-sum(a[j]*b[j] for j in range(3))]


def radius(z):
    """Shape-preserving cubic Hermite radius through original loft stations."""
    slopes = [(b[1]-a[1])/(b[0]-a[0]) for a, b in zip(PROFILE, PROFILE[1:])]
    tangents = [slopes[0]]
    for a, b in zip(slopes, slopes[1:]):
        tangents.append(0 if a*b <= 0 else 2*a*b/(a+b))
    tangents.append(slopes[-1])
    for i, (a, b) in enumerate(zip(PROFILE, PROFILE[1:])):
        if a[0] <= z <= b[0]:
            h = b[0]-a[0]
            t = (z-a[0])/h
            return ((2*t**3-3*t*t+1)*a[1] + (t**3-2*t*t+t)*h*tangents[i]
                    + (-2*t**3+3*t*t)*b[1] + (t**3-t*t)*h*tangents[i+1])
    raise ValueError(z)


def loft(rings, caps=True, periodic=False, end_centers=None):
    """Closed indexed component; share vertices so edges have two incident faces."""
    n = len(rings[0])
    ps = [tuple(p) for ring in rings for p in ring]
    ids = []
    for i in range(len(rings) if periodic else len(rings)-1):
        for j in range(n):
            a, b = i*n+j, i*n+(j+1) % n
            c, d = ((i+1) % len(rings))*n+j, ((i+1) % len(rings))*n+(j+1) % n
            ids.extend([a, b, c, b, d, c])
    if caps and not periodic:
        for i, reverse in [(0, True), (len(rings)-1, False)]:
            center = (end_centers[0 if i == 0 else 1] if end_centers else
                      [sum(p[j] for p in rings[i])/n for j in range(3)])
            ci = len(ps)
            ps.append(tuple(center))
            for j in range(n):
                face = [ci, i*n+j, i*n+(j+1) % n]
                ids.extend(face[::-1] if reverse else face)
    return ps, ids


def section(z, r, count=64):
    return [(r*math.cos(a), CENTER_Y+.96*r*math.sin(a), z)
            for a in [2*math.pi*j/count for j in range(count)]]


def foil(span, sign=1, chord=3.2, thickness=.13, sweep=.65):
    rings = []
    for i in range(9):
        t = i/8
        # Rounded taper, thick root and thinner swept tip; not a flat fin card.
        c = chord*(1-.43*t)
        h = thickness*(1-.58*t)
        rings.append([(sign*span*t, h*math.sin(a), sweep*t+c*.5*math.cos(a))
                      for a in [2*math.pi*j/16 for j in range(16)]])
    return loft(rings)


def cylinder(radius_, start, end, count=24):
    return loft([[(radius_*math.cos(a), radius_*math.sin(a), z)
                  for a in [2*math.pi*j/count for j in range(count)]]
                 for z in [start, end]])


def generate():
    doc = {'asset': {'version': '2.0', 'generator': 'Wings original stdlib submarine generator v1',
                     'extras': {'creation': 'original_authorized_generic_asset_not_a_real_class'}},
           'scene': 0, 'scenes': [{'nodes': [0]}],
           'nodes': [{'name': 'submarine_root_waterline', 'translation': [0, 0, 0],
                      'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1], 'children': []}],
           'meshes': [], 'materials': [], 'bufferViews': [], 'accessors': [], 'buffers': []}
    roles = [
        ('hull_coating', [.055, .063, .067, 1], 0, .88),
        ('sail_coating', [.069, .075, .078, 1], 0, .83),
        ('control_surface_coating', [.077, .083, .085, 1], 0, .82),
        ('panel_seam', [.026, .030, .032, 1], 0, .96),
        ('shaft_alloy', [.23, .25, .26, 1], .78, .43),
        ('propeller_alloy', [.27, .235, .17, 1], .82, .49),
        ('aperture_recess', [.012, .015, .017, 1], 0, 1),
    ]
    for name, color, metal, rough in roles:
        doc['materials'].append({'name': name, 'pbrMetallicRoughness': {
            'baseColorFactor': color, 'metallicFactor': metal, 'roughnessFactor': rough},
            'alphaMode': 'OPAQUE', 'doubleSided': False, 'extras': {'role': name}})
    binary = bytearray()
    geometry = {}
    controls = []

    def accessor(vs, kind, component, target):
        binary.extend(b'\0'*(-len(binary) % 4))
        start = len(binary)
        fmt = '<'+('f' if component == 5126 else 'H')*len(vs[0])
        for v in vs:
            binary.extend(struct.pack(fmt, *v))
        view = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': start,
                                   'byteLength': len(binary)-start, 'target': target})
        a = {'bufferView': view, 'componentType': component, 'count': len(vs), 'type': kind}
        if kind == 'VEC3':
            # Bounds describe serialized float32, not higher precision construction values.
            ps = [struct.unpack('<fff', struct.pack('<fff', *v)) for v in vs]
            a.update(bounds(ps))
        doc['accessors'].append(a)
        return len(doc['accessors'])-1

    def mesh_node(name, mesh, material, translation=(0, 0, 0), rotation=(0, 0, 0, 1), parent=0):
        ps, ids = mesh
        volume = sum(sum(ps[ids[i]][j]*cross(ps[ids[i+1]], ps[ids[i+2]])[j]
                         for j in range(3)) for i in range(0, len(ids), 3))/6
        assert abs(volume) > 1e-9, name
        if volume < 0:
            ids = [ids[i+k] for i in range(0, len(ids), 3) for k in (0, 2, 1)]
        normals = [[0, 0, 0] for _ in ps]
        for i in range(0, len(ids), 3):
            a, b, c = (ps[k] for k in ids[i:i+3])
            normal = cross(sub(b, a), sub(c, a))
            for k in ids[i:i+3]:
                normals[k] = [normals[k][j]+normal[j] for j in range(3)]
        ns = [unit(n) for n in normals]
        pi = accessor(ps, 'VEC3', 5126, 34962)
        ni = accessor(ns, 'VEC3', 5126, 34962)
        ii = accessor([(i,) for i in ids], 'SCALAR', 5123, 34963)
        mi = len(doc['meshes'])
        doc['meshes'].append({'name': name, 'primitives': [{'attributes': {'POSITION': pi, 'NORMAL': ni},
                             'indices': ii, 'material': material, 'mode': 4}]})
        node = {'name': name, 'mesh': mi, 'translation': list(translation), 'rotation': list(rotation)}
        index = len(doc['nodes'])
        doc['nodes'].append(node)
        doc['nodes'][parent].setdefault('children', []).append(index)
        geometry[name] = [struct.unpack('<fff', struct.pack('<fff', *p)) for p in ps]
        return index

    # Smooth custom loft: broad shoulder, sustained parallel midbody and long tapered stern.
    zs = [-41.9+(37+41.9)*i/72 for i in range(72)]+[37]
    mesh_node('pressure_hull_fairing', loft([section(z, radius(z)) for z in zs],
              end_centers=[(0, CENTER_Y, -42), (0, CENTER_Y, 37)]), 0)
    # Fitted rising fairing and asymmetric-length sail; all opaque, no glass cockpit.
    for name, levels in [
        ('sail_root_fairing', [(.65, 2.05, 20), (1.3, 2.0, 19.7), (2.1, 1.45, 16.2), (2.35, 1.1, 14.3)]),
        ('sail', [(1.3, 1.22, 14.2), (2.0, 1.3, 14), (4.4, 1.15, 13.4),
                  (6.8, .94, 12.6), (7.2, .78, 11.7)])]:
        rings = [[(w*math.sin(a)*(1-.12*math.cos(a)), y, -9+length*.5*math.cos(a))
                  for a in [2*math.pi*j/40 for j in range(40)]] for y, w, length in levels]
        mesh_node(name, loft(rings), 1)
    # Fine raised panel joints follow the measured loft rather than floating rectangular decals.
    for z in [-26, -5, 16, 28]:
        rings = []
        for i in range(48):
            a = 2*math.pi*i/48
            rings.append([((radius(z+.035*math.cos(b))+.022+.018*math.sin(b))*math.cos(a),
                           CENTER_Y+.96*(radius(z+.035*math.cos(b))+.022+.018*math.sin(b))*math.sin(a),
                           z+.035*math.cos(b)) for b in [2*math.pi*j/4 for j in range(4)]])
        mesh_node('hull_panel_joint_'+str(z), loft(rings, caps=False, periodic=True), 3)

    # Shaft is static. Only the actual seven blades and streamlined hub spin around +Z.
    mesh_node('propeller_shaft', cylinder(.29, 36.5, 39.5), 4, (0, CENTER_Y, 0))
    prop = mesh_node('propulsion_rotor', loft([[(r*math.cos(a), r*math.sin(a), z)
                     for a in [2*math.pi*j/32 for j in range(32)]]
                     for z, r in [(-.45, .43), (0, .58), (.55, .4), (1.05, .1)]]),
                     5, (0, CENTER_Y, 39.4))
    for blade in range(7):
        rings = []
        for i in range(13):
            t = i/12
            r = .52+2.38*t
            swept = .35*t*t
            chord = .54+.53*math.sin(math.pi*t*.88)
            angle = 2*math.pi*blade/7+swept
            twist = .48-.22*t
            ring = []
            for j in range(12):
                a = 2*math.pi*j/12
                tangent = chord*.5*math.cos(a)
                thick = (.075-.045*t)*math.sin(a)
                tangential = tangent*math.cos(twist)-thick*math.sin(twist)
                z = tangent*math.sin(twist)+thick*math.cos(twist)
                ring.append((r*math.cos(angle)-tangential*math.sin(angle),
                             r*math.sin(angle)+tangential*math.cos(angle), z))
            rings.append(ring)
        mesh_node('propeller_blade_'+str(blade+1), loft(rings), 5, parent=prop)
    controls.append({'node': 'propulsion_rotor', 'axis_local': [0, 0, 1],
                     'rest_rotation': [0, 0, 0, 1], 'rest_translation': [0, CENTER_Y, 39.4],
                     'limits_rad': None, 'motion': 'continuous_rotation',
                     'mapping': {'source': 'adapter.authoritative_forward_speed_fraction',
                                 'formula': 'angle += clamp(speed_fraction,0,1)*8*dt_seconds',
                                 'maximum_rad_s': 8, 'at_rest_rad_s': 0,
                                 'status': 'proposed_adapter_channel_not_existing_FC_field'},
                     'clearance': 'all_blades_behind_hull_and_planes_and_outside_shaft; hub_shaft_seating_intentional'})
    # Six real control planes, each with a separate geometry-bearing hinge node.
    for name, pos, rotation, sign, chord, span, axis, source in [
        ('stern_dive_port', [-3.6, CENTER_Y, 29.2], [0, 0, 0, 1], -1, 3.6, 3.3, [1, 0, 0], 'depth_rate_fraction'),
        ('stern_dive_starboard', [3.6, CENTER_Y, 29.2], [0, 0, 0, 1], 1, 3.6, 3.3, [1, 0, 0], 'depth_rate_fraction'),
        ('steering_upper', [0, CENTER_Y+3.6, 29.2], quat([0, 0, 1], math.pi/2), 1, 3.6, 3.0, [1, 0, 0], 'turn_rate_fraction'),
        ('steering_lower', [0, CENTER_Y-3.6, 29.2], quat([0, 0, 1], -math.pi/2), 1, 3.6, 3.0, [-1, 0, 0], 'turn_rate_fraction'),
        ('bow_dive_port', [-5.05, CENTER_Y+.35, -12], [0, 0, 0, 1], -1, 2.8, 2.3, [1, 0, 0], 'depth_rate_fraction'),
        ('bow_dive_starboard', [5.05, CENTER_Y+.35, -12], [0, 0, 0, 1], 1, 2.8, 2.3, [1, 0, 0], 'depth_rate_fraction'),
    ]:
        mesh_node(name, foil(span, sign, chord), 2, pos, rotation)
        # Rounded hinge support reaches inward into the fairing, ending exactly on hinge plane.
        stub = cylinder(.32, -1.0, 0)
        # Rotate a +Z cylinder onto the local outward span axis, then into the plane's rest frame.
        stub_q = qmul(rotation, quat([0, 1, 0], sign*math.pi/2 if name.startswith(('stern_dive', 'bow_dive')) else math.pi/2))
        mesh_node(name+'_hinge_support', stub, 0, pos, stub_q)
        controls.append({'node': name, 'axis_local': axis, 'rest_rotation': rotation,
                         'rest_translation': pos, 'limits_rad': [-.30, .30],
                         'motion': 'bounded_hinge',
                         'mapping': {'source': 'adapter.authoritative_'+source,
                                     'formula': 'angle = clamp(command,-1,1)*0.30; rotation = rest * axisAngle(local_axis,angle)',
                                     'status': 'proposed_adapter_channel_not_existing_FC_field'},
                         'clearance': 'foil_outside_static_hull_and_sail; hinge_contact_only_at_mount_plane'})

    launches = []
    for sign, side in [(-1, 'port'), (1, 'starboard')]:
        rotation = quat([0, 1, 0], -sign*.32)
        pos = [sign*4.6, CENTER_Y-.4, -34.4]
        # Closed annular casing with visible recessed bore: actual opening, not a named empty socket.
        rings = [[(r*math.cos(a), r*math.sin(a), z)
                  for a in [2*math.pi*j/24 for j in range(24)]]
                 for z, r in [(-.55, .52), (1.1, .63), (1.1, .36), (-.55, .36)]]
        cuff = mesh_node('launch_cuff_'+side, loft(rings, caps=False, periodic=True), 0, pos, rotation)
        mesh_node('launch_bore_recess_'+side, cylinder(.359, .88, 1.0), 6, parent=cuff)
        anchor = len(doc['nodes'])
        doc['nodes'].append({'name': 'underwater_launch_'+side, 'translation': [0, 0, -.60],
                             'rotation': [0, 0, 0, 1], 'extras': {'role': 'asset_origin_not_capability'}})
        doc['nodes'][cuff].setdefault('children', []).append(anchor)
        direction = rotate(rotation, [0, 0, -1])
        origin = [a+b for a, b in zip(pos, rotate(rotation, [0, 0, -.60]))]
        launches.append({'node': 'underwater_launch_'+side, 'geometry_node': 'launch_cuff_'+side,
                         'terminal_ring_local_z': -.55, 'terminal_ring_radius': .36,
                         'origin_local': [0, 0, -.60], 'origin_rest_root': origin,
                         'direction_local': [0, 0, -1], 'direction_rest_root': direction,
                         'derivation': 'center_of_visible_24_vertex_terminal_bore_ring_plus_0.05m_outward',
                         'clearance': 'tested_12m_ray_and_0.25m_projectile_radius_outside_hull',
                         'capability_enabled': False})

    nodes = {n['name']: (i, n) for i, n in enumerate(doc['nodes'])}
    parents = {c: i for i, n in enumerate(doc['nodes']) for c in n.get('children', [])}

    def world(i, p, pose=None):
        n = doc['nodes'][i]
        q = n.get('rotation', [0, 0, 0, 1])
        if pose and n['name'] in pose:
            c = next(c for c in controls if c['node'] == n['name'])
            q = qmul(q, quat(c['axis_local'], pose[n['name']]))
        p = [a+b for a, b in zip(rotate(q, p), n.get('translation', [0, 0, 0]))]
        return world(parents[i], p, pose) if i in parents else p

    rest = [world(nodes[name][0], p) for name, ps in geometry.items() for p in ps]
    swept = list(rest)
    for c in controls:
        # Bounds include actual descendants (all seven propeller blades), not the empty pivot alone.
        idx = nodes[c['node']][0]
        descendants = {idx}
        for _ in doc['nodes']:
            descendants |= {j for j, parent in parents.items() if parent in descendants}
        local_names = [n['name'] for j, n in enumerate(doc['nodes']) if j in descendants and 'mesh' in n]
        c['rest_bounds_root'] = bounds([world(nodes[name][0], p) for name in local_names for p in geometry[name]])
        samples = [2*math.pi*i/72 for i in range(72)] if c['limits_rad'] is None else [-.30+.60*i/24 for i in range(25)]
        ps = [world(nodes[name][0], p, {c['node']: angle}) for angle in samples
              for name in local_names for p in geometry[name]]
        c['sampled_swept_bounds_root'] = bounds(ps)
        # Analytic coordinate sinusoid extrema give continuous, not merely sampled, swept bounds.
        # Every articulated node is a direct root child; rest transforms are rigid.
        local_ps = []
        for name in local_names:
            for p in geometry[name]:
                j = nodes[name][0]
                while j != idx:
                    n = doc['nodes'][j]
                    p = [a+b for a, b in zip(rotate(n.get('rotation', [0, 0, 0, 1]), p), n.get('translation', [0, 0, 0]))]
                    j = parents[j]
                local_ps.append(p)
        axis, rq, t = c['axis_local'], c['rest_rotation'], c['rest_translation']
        low, high = c['limits_rad'] if c['limits_rad'] else [0, 2*math.pi]
        extrema = []
        for p in local_ps:
            projection = [axis[j]*sum(axis[k]*p[k] for k in range(3)) for j in range(3)]
            a = rotate(rq, sub(p, projection)); b = rotate(rq, cross(axis, p)); v = rotate(rq, projection)
            angles = [low, high]
            for j in range(3):
                phi = math.atan2(b[j], a[j])
                angles.extend(phi+k*math.pi for k in range(-3, 4) if low <= phi+k*math.pi <= high)
            extrema.extend([[t[j]+v[j]+a[j]*math.cos(angle)+b[j]*math.sin(angle) for j in range(3)] for angle in angles])
        c['swept_bounds_root'] = bounds(extrema)
        swept.extend(extrema)
    doc['buffers'] = [{'byteLength': len(binary)}]
    text = json.dumps(doc, separators=(',', ':'), allow_nan=False).encode()
    text += b' '*(-len(text) % 4)
    binary.extend(b'\0'*(-len(binary) % 4))
    glb = (struct.pack('<4sII', b'glTF', 2, 28+len(text)+len(binary))
           + struct.pack('<I4s', len(text), b'JSON')+text
           + struct.pack('<I4s', len(binary), b'BIN\0')+binary)
    descriptor = {
        'schema': 'wings_original_submarine_asset_v1', 'id': 'generic_attack_submarine',
        'identity': 'One unnamed original AI attack-submarine archetype; same asset for two faction slots.',
        'creation': {'basis': 'explicit_operator_existing_Wings_asset_order',
                     'method': 'original_Python_stdlib_procedural_geometry_and_factor_PBR',
                     'third_party_code_mesh_texture_inputs': [],
                     'authoring_model': 'openai-codex/gpt-6.1-sol',
                     'limits': 'No real class, engineering accuracy, manufacturer endorsement or independent originality/legal guarantee.'},
        'file': MODEL, 'sha256': sha(glb), 'bytes': len(glb),
        'triangles': sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']),
        'axes': {'meters': True, 'forward': '-Z', 'up': '+Y', 'right': '+X'},
        'root': 'submarine_root_waterline', 'waterline_y': 0,
        'hull_center_y': CENTER_Y, 'hull_loft_stations_z_radius': PROFILE,
        'static_bounds_root': bounds(rest),
        'static_bounds_scope': 'entire_asset_at_rest_including_moving_meshes',
        'continuous_swept_bounds_root': bounds(swept),
        'bounds_basis': 'serialized_float32_vertices_and_analytic_rigid_rotation_extrema',
        'collision': {'hull': bounds([world(nodes['pressure_hull_fairing'][0], p) for p in geometry['pressure_hull_fairing']]),
                      'policy': 'Use continuous swept bounds conservatively; precise scene water/seabed/ship clearance is FC-owned and not implemented here.'},
        'articulation': controls, 'launch_origins': launches,
        'materials': [{'index': i, 'role': r[0]} for i, r in enumerate(roles)],
        'original_existing_models_sha256': ORIGINALS,
        'objective_only': True, 'faction_slots': 2, 'player_vehicle_kind': None,
        'runtime_consumed': False, 'supported_runtime_weapon_capabilities': [],
        'unsupported_geometry': ['wheels', 'glass_cockpit', 'burner', 'gun_turret', 'animated_masts', 'launch_doors'],
        'holds': ['FC_depth_contacts_ownership_launch_damage_and_objective_authority',
                  'source_built_renderer_adapter_and_contact_safe_visibility',
                  'visual_realism_and_native_acceptance_not_claimed',
                  'upstream_Wings_redistribution_clearance_separate_from_original_asset_authorization'],
    }
    assert 8000 <= descriptor['triangles'] <= 18000
    assert len(glb) <= 1000000
    return glb, (json.dumps(descriptor, indent=2, allow_nan=False)+'\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Compare current outputs; write nothing')
    args = parser.parse_args()
    outputs = dict(zip([MODEL, DESCRIPTOR], generate()))
    if args.check:
        for path, data in outputs.items():
            assert (WINGS/path).read_bytes() == data, path
        print('PASS deterministic submarine GLB and descriptor match generated bytes')
    else:
        assert shutil.disk_usage(WINGS).free >= 2*1024**3+sum(map(len, outputs.values())), '2 GiB disk floor'
        for path, data in outputs.items():
            destination = WINGS/path
            assert destination.parent.is_dir(), destination.parent
            destination.write_bytes(data)
        d = json.loads(outputs[DESCRIPTOR])
        print(f"WROTE {d['triangles']} triangles; {d['bytes']} bytes; SHA256 {d['sha256']}")


if __name__ == '__main__':
    main()
