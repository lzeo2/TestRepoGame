import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>readFileSync(path.join(root,f),'utf8');
test('all entrypoint imports are bundled local files',()=>{
  for(const f of ['src/main.js','src/characters.js','src/rules.js','src/secret-character.js','src/character-surfaces.js','vendor/loaders/GLTFLoader.js','vendor/utils/BufferGeometryUtils.js','vendor/environments/RoomEnvironment.js']){
    for(const [,spec] of read(f).matchAll(/^\s*import[\s\S]*?from\s+['"]([^'"]+)['"]/gm)){
      assert.ok(spec.startsWith('.'),`${f}: non-local import ${spec}`);
      assert.ok(existsSync(path.resolve(root,path.dirname(f),spec)),`${f}: missing ${spec}`);
    }
  }
});
test('all UI references have initial or dynamic markup',()=>{
  const source=read('src/main.js'),html=read('index.html');
  const ids=new Set([...`${html}\n${source}`.matchAll(/id=["']([^"']+)["']/g)].map(m=>m[1]));
  for(const [,id] of source.matchAll(/\$\(['"]([^'"]+)['"]\)/g))assert.ok(ids.has(id),`Missing UI ID: ${id}`);
});
test('runtime is self-contained and uses the bundled Three.js license',()=>{
  const runtime=['index.html','style.css','src/main.js','src/characters.js','src/rules.js'].map(read).join('\n');
  assert.doesNotMatch(runtime,/(?:src|href)=["']https?:\/\//);
  assert.doesNotMatch(runtime,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
  assert.match(read('vendor/THREE-LICENSE.txt'),/MIT License/);
});
