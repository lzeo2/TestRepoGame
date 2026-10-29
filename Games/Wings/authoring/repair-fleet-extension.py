#!/usr/bin/env python3
"""Eight supplied AI-only vessel assets; stdlib only, no supplied code execution.

python3 -B Games/Wings/authoring/repair-fleet-extension.py --archive SOURCE_ZIP
Add --check for write-free byte reproduction. Never writes earlier fleet assets.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import shutil
import zipfile

HERE = Path(__file__).resolve().parent
WINGS = HERE.parent
spec = importlib.util.spec_from_file_location('fighter_archive', HERE/'repair-fighter-pair.py')
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)
g = f.g
ARCHIVE_SHA256 = f.ARCHIVE_SHA256
SOURCES = {
    # Append only: prior three descriptors and all retained pins stay byte-exact.
    'wings_aquitaine_fremm': (
        'cb8c3a46ab4bc4e0fd34633d0747664a371bff02dcb768635e3b5448bf489068', 540832, 5982,
        '4b3352b5cbf603485d19c6183240cdc1d2c4c1865504406a41b164c53ee7b128'),
    'wings_type055_renhai': (
        '7066833e6c8307e0d64906da35233ac4435fceda18f29acb7e82e219c968620b', 536996, 6014,
        'fcd1573ad4c715c75bbfacf782b6079ed2f18245b34eedff1047e384250ef239'),
    'wings_cb90_h': (
        '46aaa3e428309ad927402589a5b35243bedfa7511ee18849c50e48a45b84cfcc', 307892, 2630,
        '3112559a3e8a14b8820edb2fc602519ca6f5e71a5b7b9589d07ed3611ab03757'),
    'wings_type022_houbei': (
        'f259a65fb5a43a6647e3e740d307aba23e77ff060db8d4881a9dcb853772bdca', 331884, 2988,
        'b9f55b8bc74bec58a7eaa0ee527d7e17f2b4fcb165a52285788e6482fd7b337a'),
}
# Authenticated source calibration: hull/deck, individual solid island tiers,
# then separate ramp components. Never use the antenna-height aggregate.
CARRIERS = {
    'wings_charles_de_gaulle_r91': (304, [229, 230, 265], []),
    'wings_queen_elizabeth_class': (338, [243, 244, 274, 282, 283, 313], [203, 204]),
    'wings_liaoning_type001': (303, [232, 233, 270], [192, 193]),
    'wings_admiral_kuznetsov_project1143_5': (326, [232, 233, 270], [192, 193]),
}
SOURCES.update({
    'wings_charles_de_gaulle_r91': (
        '710d89240f0493d66d7e0982fc8cad4d9e5485a4ca6cd819420ff3452dd50610', 559588, 6048,
        '9f4f134afdf8ea787ada46211f5d5a2ae55f00c2cb9361a46336bf834c2c63f3'),
    'wings_queen_elizabeth_class': (
        'e631d38a98fff7c75220d818ab5ed6f20dc9097d56749ae7bdd5cbf536ed23e7', 592336, 6550,
        'fcfadc4268179e22773f72db6bde269b481f4241ba36563bd480ac2a6ebe1e0d'),
    'wings_liaoning_type001': (
        '62efc4a166bf3d53a197aa43dd92f7a4e21cd3b2eccb49fa0a0f4b24a0ee116a', 578588, 6320,
        '240de6de90fe61f4e2149ce220bf7e5a69861629c410011241d7434a6bbaa00d'),
    'wings_admiral_kuznetsov_project1143_5': (
        '566d2422ca21b208a37b0d11f929ac4058613912e4a78aa12f6f70a6e19143d4', 622108, 6820,
        'c2575c3422fce9698135a484a3b520d52f6b0264b254211157bf6498c2568db2'),
})
BASELINES = dict(f.BASELINES, **{
    'supplied/rafale-c.glb': 'e547d577a3a533ad6c8cadaed6f53d1b5e0850bcbf985ac6dc631488f5100561',
    'supplied/jf-17-block-iii.glb': 'b6bb06bbbf51c6af467e0e636a703d85cc53cff8b8b8b3f757e68db11aebb52a',
    'derived/wings_rafale.glb': 'fbf1d3ba66d37d6a63523700c9602901c5a545bf014a70f1546fc8c8e0e1677f',
    'derived/wings_jf17.glb': 'f8f80f2e9472a2bfb2754f8d6f9100303ecedc49d6f4ca8d234350a407c6bbd9',
})
# Keep the imported fighter BASELINES ABI and historical manifest map unchanged.
RETAINED_BASELINES = dict(f.RETAINED_BASELINES, **{
    'supplied/jas-39c-gripen.glb': 'f996e62f23cf56027b885767fcb30ae954824b198254dd8a644a14fcacd9e789',
    'supplied/mig-31bm.glb': 'dd4b8a9741ff4fb325c4a5534d1a0264148c1f0f91078f9dfcca565435e9c82f',
    'derived/wings_gripen.glb': '49f9336f7e1c2075f27bbe676791a1eb80ab00f52ab1827df2ec2b7ebfff627d',
    'derived/wings_mig31.glb': 'c220c9afd4caf065fc8d84f15060d2b5341b16aa638d4ae88677df19409765b4',
    'supplied/mirage-2000c.glb': '5e17fb6db155a50fccaa52ccb4ec1989293441d0346769c43774dc370ce1f4dd',
    'supplied/su-34.glb': '8c2f3633dd39e47a0259b0954c831bee5f8531ed38db48a9e383c277166ff50a',
    'derived/wings_mirage2000.glb': '52a7af241805d4faaf35df163fae70d49149720b2437ea7d08e37f590068631f',
    'derived/wings_su34.glb': '60ca4edcf7453fe1f7fe25893ee5564888349a258ede977243dc8fbaff7b66ab',
    'supplied/fa-50.glb': 'adf3e81efc5c5841bc30b9fa526ae7bdf83f0ccbad8fa12a142f43b73b7484f6',
    'supplied/yak-130.glb': '0bff616f2330806c42860c8d705f7ae05616f2a84e05d44530da4538da44505e',
    'derived/wings_fa50.glb': '68f02d6ff28d5f54c2181031b7faf2e8cba06839925ccaf6836b28c6cd28b079',
    'derived/wings_yak130.glb': 'b1b4f0d3569386cba10e2574dfb29b3135899fbb0b5c8a2d30dd81a55be0fce6',
    'supplied/hawk-t2.glb': '9289e2d589b8a295392b2d100c1c3462ee935f1e4837e937e0fea5240bfb54e7',
    'derived/wings_hawkt2.glb': '7dc2868e30f4f9f68be8425e04aac5e00d9145d3fe3b590b84f707827f235734',
    'supplied/su-25sm.glb': 'cf231893435e7283a5950bd7ca15591bb2ff9159ab29c001ea7b9412204b4663',
    'derived/wings_su25sm.glb': '2fe458ed79d9de72b3e122c7149ab859f64142e435f023b993bb0b50a602a767',
    'supplied/a-10c.glb': '74c58cd536be3705b347d7c32fa76b54a0692a992fadde65f82772037187d623',
    'derived/wings_a10c.glb': '897cd0cc6407cebdddaddd05224e925f577870f6f961e0903f11de367708f00e',
    'supplied/f-35a.glb': '956550b4cba4a7e4bf4f6bccd71609673f46705a7f249b18adf8f38f2a646e01',
    'derived/wings_f35a.glb': '1dfd31db6e01e7604c4145617a3a0afb3b880bc28a8017b5e61ea6b061221ce5',
    'supplied/j-20.glb': '9d70ac66e30c70a69c76b8e0c7c0151a74a4e5ab9f12691cef738b816707b862',
    'derived/wings_j20.glb': '5fcabcc098e29d6c844b0b44f3c8ead56925553ce2b005850e84828d27863b1c',
    'supplied/ah-64d-apache.glb': '01965a9e0fd16e57483f6bbda7ffadb2299f773396bb3c3045351acee4ea0a59',
    'supplied/mi-28n.glb': 'dc193d170b343ec1ca8075684b2eb5ec418b833ffbd8d1ae063be3d7ab7d0634',
    'supplied/tu-160.glb': '705f494bc379b7371c7acd0dde80f18e5002874cc7b498ff27a684b1509f6b0e',
    'derived/wings_tu160.glb': '83cfe2e45141d6917520d89b6aa579dbecf5756518cdbed1151a280f4718e791',
})
RETAINED_ENTRIES_SHA256 = 'd61f585e572ccffe22bb3d80876ae23468d7d08080990150dd7010b911bbc6be'
RETAINED_MANIFEST_SHA256 = 'ad50b3523f24e2a1ea1aa4cdf21e9736e7ebb96f0f70739a642887ec7d10c038'
RETAINED_THREE_SHA256 = 'ddbcd63aca013856a58c279b9dde7168633ba5a4544e45958e74c2f62a640092'
RETAINED_FOUR_SHA256 = 'b842aad5732bb3e523cc9bc7aa81b5c1d8c9e9f0330ef979defc6ea088461c6e'
MANIFEST = 'authoring/extended-escort-models.json'
OWNED_OUTPUTS = {MANIFEST} | {
    prefix+slug+suffix for slug in SOURCES for prefix, suffix in [
        ('models/supplied/', '.glb'), ('models/derived/', '.glb'),
        ('authoring/supplied-vessels/rigs/', '.json')]}


def retained():
    for name, expected in RETAINED_BASELINES.items():
        assert g.sha((WINGS/'models'/name).read_bytes()) == expected, name
    for name, expected in {
        'native-fighter-pair.json': '572f734f275113528ac39f495215329d8500819ee213fb04e9f063102d88d7ee',
        'supplied-fighters/repair-record.json': 'c3e462ff6fdd004fd590cd819d0b9d5ab0367082d862eb5fcea0f14471822c4b',
        'native-tu160.json': '6e4cc5225141e8f38064ddb64959a1366183559511128e1548ca55df7879b774',
        'supplied-bomber/repair-record.json': '0083cdb6a06282536a4704fcdf551782b4fbdacd741177bb74ce0c7727aecd12',
    }.items():
        assert g.sha((HERE/name).read_bytes()) == expected, name
    data = (HERE/'model-repairs.json').read_bytes()
    assert g.sha(data) == RETAINED_MANIFEST_SHA256, 'retained model-repairs.json changed'
    return json.loads(data)


def derive_cb90(source, slug):
    doc, binary = g.unpack_glb(source)
    assert not doc.get('skins') and not doc.get('animations')
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    assert {n['name'] for n in doc['nodes']} == {
        'vessel_root_waterline', 'static_hull_deck_superstructure', 'bow_ramp_pitch'}
    f.orient(doc, binary)
    nodes = {n['name']: n for n in doc['nodes']}
    root = nodes['vessel_root_waterline']
    assert g.node_matrix(root) == g.node_matrix({})
    root['extras'].update(asset_forward='glTF -Z', repair_source_id='wings.original.'+slug+'.v1')
    for material in doc['materials']:
        pbr = material.setdefault('pbrMetallicRoughness', {})
        for key, default in [('baseColorFactor', [1, 1, 1, 1]), ('metallicFactor', 1), ('roughnessFactor', 1)]:
            pbr.setdefault(key, default)
        material.setdefault('alphaMode', 'OPAQUE')
        material.setdefault('extras', {})['repair_role'] = 'mixed_naval_atlas_preserve_maps'
    matrices = g.world_matrices(doc)
    extent = g.bounds(f.world_points(doc, binary))
    static = nodes['static_hull_deck_superstructure']
    parts = g.component_bounds(doc, binary, static)
    length = extent['max'][2]-extent['min'][2]
    hulls = [b for b in parts if b['min'][1] < 0 < b['max'][1]
             and b['max'][2]-b['min'][2] > .9*length]
    assert len(hulls) == 1
    hull = hulls[0]
    decks = [b for b in parts if b['min'][1] >= hull['max'][1]-.3
             and b['max'][1]-b['min'][1] < .5 and b['max'][2]-b['min'][2] > .9*length]
    assert len(decks) == 1
    # Two substantial cabin components only; never fill the antenna-height aggregate.
    islands = [b for b in parts if b['min'][1] >= hull['max'][1]-.001
               and all(b['max'][j]-b['min'][j] > size for j, size in enumerate([2, 1, 3]))]
    assert len(islands) == 2
    ramp = nodes['bow_ramp_pitch']
    ramp_index = doc['nodes'].index(ramp)
    ramp_bounds = g.bounds([g.point(matrices[ramp_index], p) for p in g.node_points(doc, binary, ramp)])
    payload = g.pack_glb(doc, binary)
    return payload, {
        'source_model_id': 'wings.original.'+slug+'.v1',
        'source_member': 'models/'+slug+'.glb', 'source_sha256': g.sha(source),
        'file': 'models/derived/'+slug+'.glb', 'sha256': g.sha(payload), 'bytes': len(payload),
        'axes': {'forward': '-Z', 'up': '+Y', 'right': '+X', 'meters': True},
        'root': 'vessel_root_waterline', 'waterline_y': 0,
        'objective_only': True, 'player_vehicle_kind': None, 'runtime_consumed': False,
        'bounds': extent, 'static_bounds_root': g.bounds(g.node_points(doc, binary, static)),
        'continuous_swept_bounds_root': extent,
        'articulation': [{
            'node': 'bow_ramp_pitch', 'axis_local': [-1, 0, 0],
            'rest_translation': ramp['translation'],
            'bounds_local': g.bounds(g.node_points(doc, binary, ramp)),
            'swept_bounds_root': ramp_bounds, 'limits_rad': [0, 0],
            'limits_basis': 'frozen_supplied_rest_pose_no_ramp_schedule_or_mechanical_claim',
        }],
        'main_gun_geometry': None, 'launch_origins': [],
        'supported_runtime_weapon_capabilities': [],
        'collision': {
            'basis': 'geometry_component_aabbs_conservative_not_exact_hull',
            'hull': hull, 'deck': decks[0], 'island_components': islands,
            'island_bounds': g.bounds([p for b in islands for p in [b['min'], b['max']]]),
            'held': 'fine_fittings_and_resting_ramp_not_separate_collision_proxies',
        },
        'materials': {
            'role': 'mixed_naval_atlas', 'embedded_maps_preserved': True,
            'factor_change': 'explicit_gltf_defaults_only',
            'glass': 'held_mixed_opaque_atlas_requires_authored_partition_or_converter',
        },
        'holds': ['unarmed_noncapital_AI_objective_only',
                  'no_troop_ramp_schedule_waterdrive_cockpit_seats_or_ASW',
                  'no_visual_realism_native_performance_or_gameplay_acceptance'],
    }


def derive_type022(source, slug):
    doc, binary = g.unpack_glb(source)
    assert not doc.get('skins') and not doc.get('animations')
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    nodes = {n['name']: n for n in doc['nodes']}
    assert set(nodes) == {'vessel_root_waterline', 'static_hull_deck_superstructure'}
    f.orient(doc, binary)
    root = nodes['vessel_root_waterline']
    assert g.node_matrix(root) == g.node_matrix({})
    root['extras'].update(asset_forward='glTF -Z', repair_source_id='wings.original.'+slug+'.v1')
    for material in doc['materials']:
        pbr = material.setdefault('pbrMetallicRoughness', {})
        for key, default in [('baseColorFactor', [1, 1, 1, 1]), ('metallicFactor', 1), ('roughnessFactor', 1)]:
            pbr.setdefault(key, default)
        material.setdefault('alphaMode', 'OPAQUE')
        material.setdefault('extras', {})['repair_role'] = 'mixed_naval_atlas_preserve_maps'
    static = nodes['static_hull_deck_superstructure']
    assert g.node_matrix(static) == g.node_matrix({})
    parts = g.component_bounds(doc, binary, static)
    extent = g.bounds(f.world_points(doc, binary))
    length = extent['max'][2]-extent['min'][2]
    pontoons = sorted([b for b in parts if b['min'][1] < 0 < b['max'][1]
                       and b['max'][2]-b['min'][2] > .9*length], key=lambda b: b['min'][0])
    assert len(pontoons) == 2 and pontoons[0]['max'][0] < 0 < pontoons[1]['min'][0]
    decks = [b for b in parts if 0 < b['min'][1] < pontoons[0]['max'][1]
             and b['min'][0] < 0 < b['max'][0] and b['max'][1]-b['min'][1] < 1
             and b['max'][2]-b['min'][2] > .7*length]
    assert len(decks) == 1
    cabins = [b for b in parts if b['min'][1] >= decks[0]['max'][1]-.03
              and b['min'][0] < 0 < b['max'][0]
              and all(b['max'][j]-b['min'][j] > size for j, size in enumerate([2, 1, 3]))]
    assert len(cabins) == 2
    # Existing collision ABI: additional solid components, NOT semantic superstructure.
    # The second pontoon must remain separate; never bridge the waterline tunnel.
    additional = [pontoons[1]]+cabins
    payload = g.pack_glb(doc, binary)
    return payload, {
        'source_model_id': 'wings.original.'+slug+'.v1',
        'source_member': 'models/'+slug+'.glb', 'source_sha256': g.sha(source),
        'file': 'models/derived/'+slug+'.glb', 'sha256': g.sha(payload), 'bytes': len(payload),
        'axes': {'forward': '-Z', 'up': '+Y', 'right': '+X', 'meters': True},
        'root': 'vessel_root_waterline', 'waterline_y': 0,
        'objective_only': True, 'player_vehicle_kind': None, 'runtime_consumed': False,
        'bounds': extent, 'static_bounds_root': extent, 'continuous_swept_bounds_root': extent,
        'articulation': [], 'main_gun_geometry': None, 'launch_origins': [],
        'supported_runtime_weapon_capabilities': [],
        'collision': {
            'basis': 'geometry_component_aabbs_conservative_not_exact_hull',
            'hull': pontoons[0], 'deck': decks[0], 'island_components': additional,
            'island_components_basis': 'ABI_additional_solids_second_pontoon_then_two_cabins_not_all_superstructure',
            'island_bounds': g.bounds([p for b in additional for p in [b['min'], b['max']]]),
            'held': 'fine_static_fittings_and_canisters_not_separate_collision_proxies; heightfield_cannot_model_under_deck_air',
        },
        'materials': {
            'role': 'mixed_naval_atlas', 'embedded_maps_preserved': True,
            'factor_change': 'explicit_gltf_defaults_only',
            'glass': 'held_mixed_opaque_atlas_requires_authored_partition_or_converter',
        },
        'holds': ['unarmed_noncapital_AI_objective_only',
                  'static_canisters_and_class_name_grant_no_weapon_capability',
                  'no_controls_gun_launch_propulsion_sensor_or_player_vehicle',
                  'approximate_source_visual_dimensions_not_certified_real_class',
                  'no_visual_realism_native_performance_or_gameplay_acceptance'],
    }


def derive_carrier(source, slug):
    assert slug in CARRIERS and g.sha(source) == SOURCES[slug][0]
    doc, binary = g.unpack_glb(source)
    assert not doc.get('skins') and not doc.get('animations')
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    prop_names = (['port_propeller_1', 'starboard_propeller_2'] if slug == 'wings_charles_de_gaulle_r91'
                  else ['port_propeller_1', 'port_propeller_2', 'starboard_propeller_3', 'starboard_propeller_4'])
    nodes = {n['name']: n for n in doc['nodes']}
    assert len(nodes) == len(doc['nodes']) and set(nodes) == set(prop_names) | {
        'vessel_root_waterline', 'static_hull_deck_superstructure'}
    f.orient(doc, binary)
    root, static = nodes['vessel_root_waterline'], nodes['static_hull_deck_superstructure']
    assert g.node_matrix(root) == g.node_matrix(static) == g.node_matrix({})
    assert root['children'] == list(range(len(prop_names)+1))
    root['extras'].update(asset_forward='glTF -Z', repair_source_id='wings.original.'+slug+'.v1')
    for material in doc['materials']:
        pbr = material.setdefault('pbrMetallicRoughness', {})
        for key, default in [('baseColorFactor', [1, 1, 1, 1]), ('metallicFactor', 1), ('roughnessFactor', 1)]:
            pbr.setdefault(key, default)
        material.setdefault('alphaMode', 'OPAQUE')
        material.setdefault('extras', {})['repair_role'] = 'mixed_naval_atlas_preserve_maps'
    extent = g.bounds(f.world_points(doc, binary))
    static_bounds = g.bounds(g.node_points(doc, binary, static))
    parts = g.component_bounds(doc, binary, static)
    count, island_ids, ramp_ids = CARRIERS[slug]
    assert len(parts) == count
    hull, deck = parts[:2]
    assert hull['min'][1] < 0 < hull['max'][1] < deck['max'][1]
    assert deck['min'][1] > 0 and deck['max'][1]-deck['min'][1] == 1
    assert hull['max'][2]-hull['min'][2] > .99*(extent['max'][2]-extent['min'][2])
    islands, ramps = [parts[i] for i in island_ids], [parts[i] for i in ramp_ids]
    assert all(deck['max'][1] <= c['min'][1] < c['max'][1] < extent['max'][1]-5 for c in islands+ramps)
    articulation = []
    for name in prop_names:
        node = nodes[name]
        assert node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
        assert node.get('scale', [1, 1, 1]) == [1, 1, 1]
        ps = g.node_points(doc, binary, node)
        radius = max(math.hypot(p[0], p[1]) for p in ps)
        local = g.bounds(ps)
        pivot = node['translation']
        assert pivot[1] < 0 < pivot[2] and (pivot[0] < 0) == name.startswith('port_')
        swept = {'min': [pivot[0]-radius, pivot[1]-radius, pivot[2]+local['min'][2]],
                 'max': [pivot[0]+radius, pivot[1]+radius, pivot[2]+local['max'][2]]}
        articulation.append({'node': name, 'axis_local': [0, 0, -1],
                             'rest_translation': pivot, 'bounds_local': local,
                             'swept_bounds_root': swept,
                             'sweep_basis': 'analytic_full_Z_rotation_max_vertex_radius_visual_only'})
    additional = islands+ramps
    payload = g.pack_glb(doc, binary)
    return payload, {
        'source_model_id': 'wings.original.'+slug+'.v1',
        'source_member': 'models/'+slug+'.glb', 'source_sha256': g.sha(source),
        'file': 'models/derived/'+slug+'.glb', 'sha256': g.sha(payload), 'bytes': len(payload),
        'axes': {'forward': '-Z', 'up': '+Y', 'right': '+X', 'meters': True},
        'root': 'vessel_root_waterline', 'waterline_y': 0,
        'objective_only': True, 'player_vehicle_kind': None, 'runtime_consumed': False,
        'bounds': extent, 'static_bounds_root': static_bounds,
        'continuous_swept_bounds_root': g.bounds([p for c in [static_bounds]+[
            a['swept_bounds_root'] for a in articulation] for p in [c['min'], c['max']]]),
        'articulation': articulation, 'main_gun_geometry': None, 'launch_origins': [],
        'supported_runtime_weapon_capabilities': [],
        'collision': {
            'basis': 'geometry_component_aabbs_conservative_not_exact_hull',
            'hull': hull, 'deck': deck, 'island_components': additional,
            'island_components_basis': 'ABI_additional_solids_individual_island_tiers_then_static_ski_jump_components_not_all_semantic_islands',
            'island_bounds': g.bounds([p for c in additional for p in [c['min'], c['max']]]),
            'source_component_calibration': {'total': count, 'hull': 0, 'deck': 1,
                                             'island_solids': island_ids, 'static_ramps': ramp_ids},
            'held': 'AABBs_conservatively_fill_sloped_ramp_below_max_height; fine_fittings_masts_and_appendages_not_separate_collision_proxies',
        },
        'materials': {'role': 'mixed_naval_atlas', 'embedded_maps_preserved': True,
                      'factor_change': 'explicit_gltf_defaults_only',
                      'glass': 'held_mixed_opaque_atlas_requires_authored_partition_or_converter'},
        'holds': ['unarmed_noncapital_AI_objective_geometry_and_visual_prop_rotation_only',
                  'no_naval_weapons_runway_deck_services_airwing_player_driving_or_seats',
                  'source_four_screws_QE_retained_not_real_class_propulsion_certification',
                  'approximate_source_dimensions_not_realistic_carrier_operations',
                  'native_serviced_runways_HELD_existing_passive_launch_carriers_unchanged',
                  'no_visual_realism_native_pixels_performance_or_gameplay_acceptance'],
    }


def generate(archive):
    # Existing validator checks pinned size/SHA, all 65 safe paths, CRC and full member hashes.
    f.archive_members(archive)
    previous = retained()
    outputs, models = {}, []
    with zipfile.ZipFile(archive) as z:
        for slug, (expected, size, triangles, rig_sha) in SOURCES.items():
            source = z.read('models/'+slug+'.glb')
            rig_bytes = z.read('rigs/'+slug+'.json')
            assert len(source) == size and g.sha(source) == expected
            assert g.sha(rig_bytes) == rig_sha
            rig = json.loads(rig_bytes)
            assert rig['model_id'] == 'wings.original.'+slug+'.v1'
            if slug in CARRIERS:
                assert rig['model_file'] == 'models/'+slug+'.glb' and rig['unit'] == 'meter'
                assert rig['animations_included'] == []
            doc, binary = g.unpack_glb(source)
            assert sum(len(g.accessor(doc, binary, p['indices']))//3
                       for m in doc['meshes'] for p in m['primitives']) == triangles
            payload, descriptor = (derive_carrier(source, slug) if slug in CARRIERS
                                   else derive_type022(source, slug) if slug == 'wings_type022_houbei'
                                   else derive_cb90(source, slug) if slug == 'wings_cb90_h'
                                   else g.derive(source, slug))
            assert len(payload) < 1_000_000
            controls = {c['node']: c for c in rig['controls']}
            assert set(controls) == {a['node'] for a in descriptor['articulation']}
            for a in descriptor['articulation']:
                x, y, z_axis = controls[a['node']]['suggested_local_rotation_axis']
                a['axis_local'] = [-x, -y, z_axis]
            outputs['models/supplied/'+slug+'.glb'] = source
            outputs[descriptor['file']] = payload
            outputs['authoring/supplied-vessels/rigs/'+slug+'.json'] = rig_bytes
            models.append(descriptor)
    manifest = {
        'schema': previous['schema'], 'archive_name': previous['archive_name'],
        'archive_sha256': ARCHIVE_SHA256,
        'permission': {
            'basis': 'operator_report_and_scoped_authorization',
            'report': 'User reports generating supplied assets with GPT and authorizes scoped Wings use/repair.',
            'limits': 'Not independent originality, license, photographic realism, real-class certification or upstream rights clearance.'},
        'conversion': previous['conversion'], 'existing_model_sha256': BASELINES,
        'retained_model_repairs_sha256': RETAINED_MANIFEST_SHA256,
        'models': models,
    }
    assert g.sha(f.encoded(models[:2])) == RETAINED_ENTRIES_SHA256, 'prior vessel descriptors changed'
    assert g.sha(f.encoded(models[:3])) == RETAINED_THREE_SHA256, 'prior three descriptors changed'
    assert g.sha(f.encoded(models[:4])) == RETAINED_FOUR_SHA256, 'prior four descriptors changed'
    outputs[MANIFEST] = f.encoded(manifest)
    assert set(outputs) == OWNED_OUTPUTS and sum(map(len, outputs.values())) < 8_700_000
    assert sum(len(data) for name, data in outputs.items() if 'wings_type022_houbei' in name) + len(outputs[MANIFEST]) < 1_000_000
    assert sum(len(data) for name, data in outputs.items() if 'wings_cb90_h' in name) + len(outputs[MANIFEST]) < 1_000_000
    return outputs


def write_outputs(outputs):
    # Validate every target BEFORE any mkdir/write, including corrupt generator output.
    for name, expected in RETAINED_BASELINES.items():
        key = 'models/'+name
        if key in outputs:
            assert key in OWNED_OUTPUTS and g.sha(outputs[key]) == expected, 'refusing retained GLB overwrite'
    if MANIFEST in outputs:
        assert g.sha(f.encoded(json.loads(outputs[MANIFEST])['models'][:2])) == RETAINED_ENTRIES_SHA256
        assert g.sha(f.encoded(json.loads(outputs[MANIFEST])['models'][:3])) == RETAINED_THREE_SHA256
        assert g.sha(f.encoded(json.loads(outputs[MANIFEST])['models'][:4])) == RETAINED_FOUR_SHA256
    assert set(outputs) == OWNED_OUTPUTS, 'refusing unowned output path'
    models = json.loads(outputs[MANIFEST])['models']
    assert len(models) == len(SOURCES)
    for model, (slug, (source_sha, size, triangles, rig_sha)) in zip(models, SOURCES.items()):
        assert model['source_model_id'] == 'wings.original.'+slug+'.v1'
        assert g.sha(outputs['models/supplied/'+slug+'.glb']) == source_sha, 'corrupt raw output'
        assert g.sha(outputs['authoring/supplied-vessels/rigs/'+slug+'.json']) == rig_sha, 'corrupt rig output'
        payload = outputs['models/derived/'+slug+'.glb']
        assert model['file'] == 'models/derived/'+slug+'.glb'
        assert g.sha(payload) == model['sha256'] and len(payload) == model['bytes'] < 1_000_000, 'corrupt derived output'
        assert len(outputs['models/supplied/'+slug+'.glb']) == size
        if slug in CARRIERS:
            exact_payload, exact_model = derive_carrier(outputs['models/supplied/'+slug+'.glb'], slug)
            assert payload == exact_payload and model == exact_model, 'corrupt carrier derivation or descriptor'
    assert sum(map(len, outputs.values())) < 8_700_000, 'aggregate output budget'
    retained()
    size = sum(map(len, outputs.values()))
    assert shutil.disk_usage(WINGS).free-size >= 2**31, '2 GiB floor would be crossed'
    for name, data in outputs.items():
        path = WINGS/name
        assert not path.is_symlink(), 'refusing symlink target: '+name
        assert all(not p.is_symlink() for p in path.parents if p != WINGS.parent), name
    for name, data in outputs.items():
        path = WINGS/name
        if path.exists() and path.read_bytes() == data:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print(f'WROTE: 8 raw vessels, 8 derivatives, 8 pristine rigs and descriptor; {size} bytes; identical old outputs skipped')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs = generate(args.archive)
    if args.check:
        for name, data in outputs.items():
            assert (WINGS/name).read_bytes() == data, name
        print('PASS: eight raw vessels/rigs, eight derivatives and manifest reproduce byte-exact; no writes')
    else:
        write_outputs(outputs)


if __name__ == '__main__':
    main()
