"""Offline PBR/immutable-geometry regression. Run: python3 -B <this file>."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import time
import zlib

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
BASELINE = '3b121f238523c9517097056f8720b81900c3f880'
BASE_SHA = '1f0eae7f3b962669c2f95f1ce52e3f27cce008595f4875bae41e9274b24da65a'
GEOMETRY_SHA = '38121b7244b3e8bdcab6e446e4fd5bfa0071a8743656a430b1ac80ecf7867c11'
METADATA_SHA = 'de6d0e05cab06223bc1860bc544defeeaff9700a22fa05f9ed67c475f1e04d0d'
JET_SHA = {'f15':'5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf',
           'f35':'ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197'}


def unpack(data):
    size = struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+size]), data[28+size:]


def png_rgb(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, chunks, compressed = 8, [], bytearray()
    width = height = None
    while pos < len(data):
        size = struct.unpack_from('>I',data,pos)[0]
        kind = data[pos+4:pos+8]
        payload = data[pos+8:pos+8+size]
        assert len(payload) == size
        crc = struct.unpack_from('>I',data,pos+8+size)[0]
        assert crc == zlib.crc32(kind+payload)&0xffffffff, 'PNG CRC'
        chunks.append(kind)
        if kind == b'IHDR':
            width,height,depth,color,compression,filtering,interlace = struct.unpack('>IIBBBBB',payload)
            assert (depth,color,compression,filtering,interlace) == (8,2,0,0,0)
            assert 64 <= width <= 256 and 64 <= height <= 256
        elif kind == b'IDAT':
            compressed.extend(payload)
        elif kind == b'IEND':
            assert size == 0
        else:
            raise AssertionError('Unexpected PNG chunk')
        pos += 12+size
    assert pos == len(data) and chunks == [b'IHDR',b'IDAT',b'IEND']
    raw = zlib.decompress(compressed)
    stride = width*3+1
    assert len(raw) == stride*height and all(raw[y*stride] == 0 for y in range(height))
    pixels = b''.join(raw[y*stride+1:(y+1)*stride] for y in range(height))
    assert len(set(zip(pixels[::3],pixels[1::3],pixels[2::3]))) > 1, 'flat image'
    return width,height,pixels


def main():
    baseline = subprocess.check_output(['git','show',BASELINE+':Games/Wings/models/speedboat.glb'],cwd=REPO)
    assert len(baseline) == 1_069_292 and hashlib.sha256(baseline).hexdigest() == BASE_SHA
    old, old_binary = unpack(baseline)
    data = (ROOT.parent/'models/speedboat.glb').read_bytes()
    doc, binary = unpack(data)
    keys = ('accessors','bufferViews','meshes','nodes','scene','scenes')
    assert hashlib.sha256(json.dumps({k:old[k] for k in keys},sort_keys=True,separators=(',',':')).encode()).hexdigest() == METADATA_SHA
    assert hashlib.sha256(old_binary).hexdigest() == GEOMETRY_SHA
    assert binary[:len(old_binary)] == old_binary, 'original geometry prefix changed'
    for key in keys:
        actual = doc[key][:len(old[key])] if key == 'bufferViews' else doc[key]
        assert actual == old[key], key+' metadata changed'
    assert len(doc['accessors']) == 1160
    accessor_hash = hashlib.sha256()
    for before,after in zip(old['accessors'],doc['accessors']):
        a,b = old['bufferViews'][before['bufferView']],doc['bufferViews'][after['bufferView']]
        original = old_binary[a['byteOffset']:a['byteOffset']+a['byteLength']]
        current = binary[b['byteOffset']:b['byteOffset']+b['byteLength']]
        assert original == current, 'accessor bytes changed'
        accessor_hash.update(current)
    assert accessor_hash.hexdigest() == GEOMETRY_SHA
    assert doc['extras'] == old['extras'] and doc['asset'] == old['asset']
    assert len(doc['materials']) == 92
    assert sum(len(mesh['primitives']) for mesh in doc['meshes']) == 258
    assert all('TANGENT' not in p['attributes'] for mesh in doc['meshes'] for p in mesh['primitives'])
    appended = doc['bufferViews'][len(old['bufferViews']):]
    assert len(appended) == len(doc['images']) == len(doc['textures'])
    assert all(view['byteOffset'] >= len(old_binary) and 'target' not in view for view in appended)
    decoded = {}
    for index,image in enumerate(doc['images']):
        assert image['mimeType'] == 'image/png' and 'uri' not in image
        assert image['bufferView'] == len(old['bufferViews'])+index
        view = doc['bufferViews'][image['bufferView']]
        assert view['byteOffset']%4 == 0
        texture = doc['textures'][index]
        assert texture == {'source':index,'sampler':0}
        width,height,pixels = png_rgb(binary[view['byteOffset']:view['byteOffset']+view['byteLength']])
        decoded[image['name']] = (width,height,pixels)
        if image['name'].endswith('tangent_normal'):
            if image['name'] == 'nonskid_tangent_normal':
                assert max(abs(c-128) for k,c in enumerate(pixels) if k%3 != 2) <= 20, 'coarse nonskid grain'
            assert min(pixels[2::3]) >= 240, 'normal points away from surface'
            for i in range(0,len(pixels),3):
                n = [(c/255)*2-1 for c in pixels[i:i+3]]
                assert abs(sum(c*c for c in n)-1) < .018, 'non-unit normal'
        elif image['name'].endswith('weather_basecolor'):
            assert pixels[::3] == pixels[1::3] == pixels[2::3], 'colored rust/yellow mask'
            assert min(pixels) >= 190 and max(pixels) <= 255, 'excessive weathering'
        else:
            assert set(pixels[::3]) == {255}
            if image['name'].startswith(('steel_','alloy_')):
                assert min(pixels[2::3]) >= 240
            else:
                assert set(pixels[2::3]) == {0}, 'dielectric made metallic'
            assert max(pixels[1::3])-min(pixels[1::3]) >= 5
    assert doc['samplers'] == [{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}]
    for mat in doc['materials']:
        pbr = mat['pbrMetallicRoughness']
        for texture in (pbr['baseColorTexture'],pbr['metallicRoughnessTexture'],mat['normalTexture']):
            assert texture['texCoord'] == 0 and 0 <= texture['index'] < len(doc['textures'])
        assert 0 < mat['normalTexture']['scale'] <= 1
        family = doc['images'][pbr['baseColorTexture']['index']]['name'].removesuffix('_weather_basecolor')
        assert pbr['metallicFactor'] == 0 if family not in ('steel','alloy') else pbr['metallicFactor'] >= .8
        assert doc['images'][pbr['metallicRoughnessTexture']['index']]['name'] == family+'_metallic_roughness'
        assert doc['images'][mat['normalTexture']['index']]['name'] == family+'_tangent_normal'
    for mesh in old['meshes']:
        if mesh['name'] not in ('hull_L_topsides','hull_R_topsides'):
            continue
        source = [old['materials'][p['material']]['pbrMetallicRoughness']['roughnessFactor']
                  for p in mesh['primitives']]
        finish = [doc['materials'][p['material']]['pbrMetallicRoughness']['roughnessFactor']
                  for p in mesh['primitives']]
        assert len(set(finish)) == 4 and all(.5 <= r <= .61 for r in finish)
        assert all(abs((b-a)-.23) < 1e-12 for a,b in zip(source,finish)), 'finish variation lost'
    # Independent interpolation from baseline positions. No duplicated hull formula.
    waterline_samples = 0
    for family,mesh_name in [('hull_port','hull_L_topsides'),('hull_starboard','hull_R_topsides'),('hull_bottom','hull_L_deadrise')]:
        mesh = next(mesh for mesh in old['meshes'] if mesh['name'] == mesh_name)
        a = old['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
        view = old['bufferViews'][a['bufferView']]
        xyz = struct.unpack_from('<'+'f'*(a['count']*3),old_binary,view['byteOffset'])
        width,height,packed = decoded[family+'_metallic_roughness']
        base = decoded[family+'_weather_basecolor'][2]
        wet,dry,salt = [],[],[]
        for j in range(height):
            v = j/(height-1)*12
            column = min(11,int(v)); t = v-column
            for i in range(width):
                u = i/(width-1)*48
                row = min(47,int(u)); s = u-row
                y0 = xyz[(row*13+column)*3+1]*(1-t)+xyz[(row*13+column+1)*3+1]*t
                y1 = xyz[((row+1)*13+column)*3+1]*(1-t)+xyz[((row+1)*13+column+1)*3+1]*t
                y = y0*(1-s)+y1*s
                offset = (j*width+i)*3
                sample = (packed[offset+1],base[offset])
                if y < -.06:
                    wet.append(sample)
                    assert 105 <= sample[0] <= 115, (family,y,sample)
                elif y > .17:
                    dry.append(sample)
                    edge = family != 'hull_bottom' and min(abs(i/(width-1)-s) for s in (.25,.5,.75)) < .006
                    assert (203 if edge else 218) <= sample[0] <= 237, (family,y,sample)
                elif .05 < y < .08:
                    salt.append(sample)
                    assert sample[0] >= 240, 'missing salt roughness band'
                if abs(y) < .01:
                    waterline_samples += 1
                    assert 165 <= sample[0] <= 214, 'Y=0 wet/dry boundary misplaced'
        assert wet and dry and salt, family
        mean = lambda samples,k:sum(p[k] for p in samples)/len(samples)
        assert mean(dry,0)-mean(wet,0) > 100
        assert mean(dry,1)-mean(wet,1) > 25
        assert mean(salt,1) > mean(dry,1), 'salt should be restrained lighter deposits'
    assert waterline_samples > 100
    spec = importlib.util.spec_from_file_location('boat_generator',ROOT/'generate-models.py')
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    # Vertical streak mask varies sharply fore-aft and slowly along the section.
    across = [generator.boat_weather(i/255,.7,.4,.5)[2] for i in range(256)]
    vertical = [generator.boat_weather(.24,j/255,.4,.5)[2] for j in range(256)]
    variation = lambda a:sum(abs(b-c) for b,c in zip(a,a[1:]))
    assert variation(across) > 10*variation(vertical)
    # Broken scuffs follow only existing finish boundaries, never bottom plating.
    for seam in (.25,.5,.75):
        wear = [generator.boat_weather(seam,j/127,.4,.5)[3] for j in range(128)]
        assert max(wear) > .6 and wear.count(0) > 30, 'missing irregular panel-edge wear'
        assert all(generator.boat_weather(seam+.02,j/127,.4,.5)[3] == 0 for j in range(128))
        assert all(generator.boat_weather(seam,j/127,.4,.5,topside=False)[3] == 0 for j in range(128))
        assert generator.boat_weather(seam,.7,-.1,1)[3] == 0, 'underwater edge scuff'
    # Serialized highlights must coincide with the authored finish boundaries.
    edge_samples = 0
    for family in ('hull_port','hull_starboard'):
        width,height,packed = decoded[family+'_metallic_roughness']
        for seam in (.25,.5,.75):
            i = round(seam*(width-1))
            for j in range(round(height*.65),height):
                if packed[(j*width+i)*3+1] < 215:
                    edge_samples += 1
    assert edge_samples > 20, 'panel-edge highlights absent from GLB'
    started = time.perf_counter()
    one = generator.speedboat().finish()
    elapsed = time.perf_counter()-started
    assert one == data == generator.speedboat().finish(), 'generation not deterministic'
    for name,expected in JET_SHA.items():
        jet = (ROOT.parent/'models'/f'{name}.glb').read_bytes()
        assert hashlib.sha256(jet).hexdigest() == expected
        assert getattr(generator,name)().finish() == jet
    result = generator.check_model(data)
    assert result['triangles'] == 17_252 and len(data) < 2*1024*1024
    print('PASS '+json.dumps({**result,'geometry_sha256':accessor_hash.hexdigest(),
          'baseline_bytes':len(baseline),'delta_bytes':len(data)-len(baseline),
          'images':len(decoded),'waterline_samples':waterline_samples,'panel_edge_samples':edge_samples,
          'generation_seconds':round(elapsed,3),'jets':'exact baseline bytes'},sort_keys=True))


if __name__ == '__main__':
    main()
