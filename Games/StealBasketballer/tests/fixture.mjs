// Runnable integration entry. game.mjs owns the single short Game -> Match -> reload flow.
import assert from 'node:assert/strict';
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const rootPath=await realpath(root);
const seen=new Set();
async function localClosure(url) {
  const path=await realpath(url);
  assert.ok(path.startsWith(rootPath+'/'),'Dependency escapes basketball sibling: '+url);
  assert.ok((await stat(path)).isFile(),'Missing local dependency: '+url);
  if(seen.has(path))return;
  seen.add(path);
  if(!/\.(?:html|css|js|svg)$/.test(path))return;
  const source=await readFile(path,'utf8');
  // Follow literal sibling imports, data loads, fonts and shell assets. No browser simulation.
  const refs=[...source.matchAll(/['"](\.{1,2}\/[^'"\s]+\.(?:js|json|css|svg|woff2))['"]/g)].map(m=>m[1]);
  for(const match of source.matchAll(/(\b(?:src|href)\s*=\s*['"]|\burl\(\s*['"]?)([^'"\s)>]+)/g)) {
    const ref=match[2];
    if(ref.startsWith('#'))continue;
    assert.match(ref,/^\.{1,2}\//,'Non-local asset: '+ref);
    // Navigation is not a runtime dependency; still require its target to exist.
    if(match[1].startsWith('href')&&/\.(?:html|md)$/.test(ref)) {
      assert.ok((await stat(new URL(ref,root))).isFile(),'Missing navigation target: '+ref);
      continue;
    }
    // HTML attributes (including app templates) use the document base; CSS uses its file.
    await localClosure(new URL(ref,match[1].startsWith('url(')?url:root));
  }
  for(const match of source.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
    assert.match(match[1],/^\.{1,2}\//,'Non-local module import: '+match[1]);
    refs.push(match[1]);
  }
  for(const ref of new Set(refs)) {
    assert.match(ref,/^\.{1,2}\//,'Non-local asset: '+ref);
    // app fetch() data URLs resolve against the document, not the ES module.
    await localClosure(new URL(ref,ref.endsWith('.json')?root:url));
  }
}
await localClosure(new URL('index.html',root));
for(const name of ['catalog','world'])assert.ok(seen.has(fileURLToPath(new URL(`data/${name}.json`,root))),`${name} data is reachable`);
const data=JSON.parse(await readFile(new URL('data/catalog.json',root),'utf8'));
assert.equal(data.metadata.sport,'basketball');
assert.match(data.metadata.ratingsSource,/original authored arcade/i,'Ratings must retain original arcade provenance');
console.log(`PASS static sibling dependency closure: ${seen.size} local files, no external asset references`);
// Reuse cardinality, roles/stats, catalog references, fake storage isolation and one bounded match.
await import('./game.mjs');
console.log('PASS basketball integration entry (one short match, no browser or seed sweeps)');
