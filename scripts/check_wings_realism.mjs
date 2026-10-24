#!/usr/bin/env node
// Browser-free candidate checks. Supply the recovered source root, not generated game bundles.
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, statfs, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: Object.fromEntries(
  ['source', 'three-root', 'esbuild-root', 'models'].map(key => [key, { type: 'string' }]),
) });
for (const key of ['source', 'three-root', 'esbuild-root', 'models']) assert(values[key], `Required --${key}`);
const source = resolve(values.source), three = resolve(values['three-root']);
const models = resolve(values.models), tool = resolve(values['esbuild-root']);
assert.equal(JSON.parse(await readFile(join(three, 'package.json'))).version, '0.186.0');
const { build, version } = await import(pathToFileURL(join(tool, 'lib/main.js')));
assert.equal(version, '0.28.2');
const disk = await statfs('.');
assert(disk.bavail * disk.bsize >= 2 * 1024 ** 3 + 20 * 1024 ** 2, 'Requires 2 GiB plus 20 MiB check reserve');
await mkdir('.tmp', { recursive: true });
const temporary = await mkdtemp(resolve('.tmp/wings-realism-check-'));
function run(args, cwd = source) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120_000 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  assert(!result.error, result.error?.message);
  assert.equal(result.status, 0, `Node check failed: ${args.join(' ')}`);
}
try {
  // Keep import.meta.url pointing to the authored aircraft check beside its source files.
  run(['--experimental-strip-types', join(source, 'games/wings/aircraft-realism-check.ts'), models]);
  for (const name of ['terrain-realism', 'cloud-realism', 'shadow-realism', 'lighting']) {
    const output = join(temporary, `${name}.mjs`);
    const result = await build({ entryPoints: [join(source, `games/wings/${name}-check.ts`)],
      bundle: true, platform: 'node', format: 'esm', write: false,
      plugins: [{ name: 'exact-three-source', setup(api) {
        // Internal shader builders and TSL must share one module graph, not built + source copies.
        api.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) => ({ path:
          path === 'three/webgpu' ? join(three, 'src/Three.WebGPU.js') :
          path === 'three/tsl' ? join(three, 'src/Three.TSL.js') :
          path.startsWith('three/src/') ? join(three, path.slice(6)) :
          path.startsWith('three/addons/') ? join(three, 'examples/jsm', path.slice(13)) :
          join(three, 'src/Three.js'),
        }));
      } }],
    });
    await writeFile(output, result.outputFiles[0].contents);
    run(['--check', output]);
    run([output, models]);
  }
  console.log('PASS 5 Wings realism CPU/graph suites; generated Node syntax checks; no browser or FPS claim');
} finally {
  await rm(temporary, { recursive: true, force: true }); // Only this invocation's generated files.
}
