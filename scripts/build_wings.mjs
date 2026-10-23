#!/usr/bin/env node
// Source-only Wings build. Models/fonts and deployment HTML adjustments belong to delivery.
// Usage: node scripts/build_wings.mjs --source <wings> --three-root <package> --esbuild-root <package> --out <empty-dir>
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, statfs } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: Object.fromEntries(
  ['source', 'three-root', 'esbuild-root', 'out'].map(key => [key, { type: 'string' }]),
) });
for (const key of ['source', 'three-root', 'esbuild-root', 'out']) {
  assert(values[key], `Required: --${key}`);
}
const source = resolve(values.source);
const threeRoot = resolve(values['three-root']);
const esbuildRoot = resolve(values['esbuild-root']);
const out = resolve(values.out);
const repo = fileURLToPath(new URL('../', import.meta.url));
const text = path => readFile(path, 'utf8');
const json = async path => JSON.parse(await text(path));
const slash = path => path.split(sep).join('/');
const inside = (root, path) => {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};
assert(!inside(source, out) && !inside(out, source), 'Output must not overlap source');
assert(!inside(threeRoot, out) && !inside(esbuildRoot, out), 'Output must not overwrite tools');
if (existsSync(out)) assert.equal((await readdir(out)).length, 0, 'Output must be empty');
let diskPath = dirname(out);
while (!existsSync(diskPath)) diskPath = dirname(diskPath);
const disk = await statfs(diskPath);
const floor = 2 * 1024 ** 3;
const cap = 30 * 1024 ** 2;
assert(disk.bavail * disk.bsize >= floor + cap, 'Build requires 2 GiB free plus 30 MiB output reserve');

const three = await json(resolve(threeRoot, 'package.json'));
const tool = await json(resolve(esbuildRoot, 'package.json'));
assert.equal(three.name, 'three');
assert.equal(three.version, '0.186.0', 'Three version must be 0.186.0');
assert.equal(tool.name, 'esbuild');
assert.equal(tool.version, '0.28.2', 'esbuild version must be 0.28.2');
const manifest = await json(resolve(source, 'package.json'));
assert.deepEqual(manifest.dependencies, { three: '0.186.0' }, 'Unexpected runtime dependencies');
const notice = await text(resolve(repo, 'Games/Wings/THREE-LICENSE.txt'));
assert.equal(notice.trim(), (await text(resolve(threeRoot, 'LICENSE'))).trim(), 'Retained Three notice differs');
const { build, version } = await import(pathToFileURL(resolve(esbuildRoot, 'lib/main.js')).href);
assert.equal(version, tool.version);

const streamer = resolve(source, 'src/render/world/streamer.ts');
const workerURL = 'new URL("./terrain-worker.ts", import.meta.url)';
const streamerText = await text(streamer);
assert.equal(streamerText.split(workerURL).length, 2, 'Expected exactly one authored worker URL');
let workerTransforms = 0;
function plugins(node) {
  return [{
    name: 'wings-local-source',
    setup(api) {
      api.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point' || args.path.startsWith('./') || args.path.startsWith('../')) return;
        if (node && isBuiltin(args.path)) return { path: args.path, external: true };
        assert(args.path === 'three' || args.path.startsWith('three/'), `Unknown package import: ${args.path}`);
        const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
        let target = three.exports[key];
        if (!target) {
          for (const [pattern, value] of Object.entries(three.exports)) {
            if (!pattern.endsWith('*') || !key.startsWith(pattern.slice(0, -1))) continue;
            target = value.replace('*', key.slice(pattern.length - 1));
            break;
          }
        }
        if (target && typeof target === 'object') target = target.import;
        assert.equal(typeof target, 'string', `Unsupported Three export: ${key}`);
        const path = resolve(threeRoot, target);
        assert(inside(threeRoot, path) && existsSync(path), `Missing Three export: ${key}`);
        return { path };
      });
      api.onLoad({ filter: /[/\\]streamer\.ts$/ }, args => {
        assert.equal(args.path, streamer, 'Unexpected streamer source');
        workerTransforms++;
        return { contents: streamerText.replace(workerURL, 'new URL("./terrain-worker.js", import.meta.url)'), loader: 'ts' };
      });
    },
  }];
}
const common = {
  absWorkingDir: source, bundle: true, format: 'esm', target: 'es2022',
  minify: true, legalComments: 'eof', metafile: true, write: false,
  // Preserve shader text, but escape its newlines/whitespace instead of emitting raw template lines.
  supported: { 'template-literal': false },
  define: { 'import.meta.env.BASE_URL': JSON.stringify('./'), 'import.meta.env.DEV': 'false' },
  logLevel: 'warning',
};
// Keep all browser chunks beside the named worker so its import.meta.url stays valid.
const browser = await build({ ...common, platform: 'browser', splitting: true,
  entryPoints: {
    'assets/main': 'src/main.ts', 'assets/ui-check': 'ui-check.ts',
    'assets/terrain-worker': 'src/render/world/terrain-worker.ts',
  },
  outdir: out, chunkNames: 'assets/[name]-[hash]', plugins: plugins(false),
});
assert.equal(workerTransforms, 1, 'Worker transform was not used exactly once');
const checks = await build({ ...common, platform: 'node',
  entryPoints: ['astra-check.ts', 'solo-check.ts', 'lighting-check.ts'], outdir: resolve(out, 'verification'),
  outExtension: { '.js': '.mjs' }, plugins: plugins(true),
});
const files = new Map([...browser.outputFiles, ...checks.outputFiles].map(f => [f.path, f.contents]));
const outputs = {};
for (const [result, node] of [[browser, false], [checks, true]]) {
  for (const [path, info] of Object.entries(result.metafile.outputs)) {
    const absolute = resolve(source, path);
    assert(files.has(absolute), 'Metafile output missing');
    for (const item of info.imports) {
      if (item.external) assert(node && isBuiltin(item.path), `External runtime import: ${item.path}`);
      else assert(files.has(resolve(source, item.path)), `Missing generated import: ${item.path}`);
      assert(!/\.tsx?(?:[?#]|$)/.test(item.path), 'Uncompiled import URL');
    }
    outputs[slash(relative(out, absolute))] = {
      bytes: info.bytes,
      ...(info.entryPoint ? { entryPoint: slash(relative(source, resolve(source, info.entryPoint))) } : {}),
      imports: info.imports.map(item => item.external ? item.path : slash(relative(out, resolve(source, item.path)))),
      ...(info.cssBundle ? { cssBundle: slash(relative(out, resolve(source, info.cssBundle))) } : {}),
    };
  }
}
for (const [htmlName, entry, original] of [
  ['index.html', 'src/main.ts', 'src="/src/main.ts"'],
  ['check-ui.html', 'ui-check.ts', 'src="./ui-check.ts"'],
]) {
  const matches = Object.entries(outputs).filter(([, info]) => info.entryPoint === entry);
  assert.equal(matches.length, 1, `Missing HTML entry: ${entry}`);
  const [js, info] = matches[0];
  let html = await text(resolve(source, htmlName));
  assert.equal(html.split(original).length, 2, `Expected exactly one module entry in ${htmlName}`);
  html = html.replace(original, `src="./${js}"`);
  assert(info.cssBundle && files.has(resolve(out, info.cssBundle)), 'Missing entry CSS bundle');
  assert.equal(html.split('</head>').length, 2, 'Expected one HTML head');
  html = html.replace('</head>', `<link rel="stylesheet" href="./${info.cssBundle}">\n</head>`);
  for (const [, url] of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)) {
    assert(files.has(resolve(out, url)), `Missing generated HTML reference: ${url}`);
  }
  assert(!/(?:src|href)=["'][^"']*\.tsx?(?:["'?#])/.test(html), 'Uncompiled HTML URL');
  assert(!/(?:src|href)=["'](?:https?:)?\/\//.test(html), 'External HTML load');
  files.set(resolve(out, htmlName), Buffer.from(html));
}
let workerReferences = 0;
for (const [path, bytes] of files) {
  if (!path.endsWith('.js')) continue;
  const code = Buffer.from(bytes).toString();
  assert(!/new URL\(["'][^"']*\.ts["']/.test(code), 'Uncompiled runtime URL');
  for (const [, url] of code.matchAll(/new URL\("(\.\/terrain-worker\.js)",import\.meta\.url\)/g)) {
    assert(files.has(resolve(dirname(path), url)), 'Missing worker output');
    workerReferences++;
  }
}
assert.equal(workerReferences, 1, 'Expected one generated local worker reference');
files.set(resolve(out, 'THREE-LICENSE.txt'), Buffer.from(notice));
files.set(resolve(out, 'build-meta.json'), Buffer.from(JSON.stringify({
  tools: { esbuild: version, three: three.version }, outputs,
}, null, 2) + '\n'));
const bytes = [...files.values()].reduce((sum, data) => sum + data.length, 0);
assert(bytes <= cap, 'Output exceeds 30 MiB cap');
for (const [path, data] of files) {
  assert(inside(out, path), 'Output escaped destination');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data, { flag: 'wx' });
}
console.log(`PASS esbuild ${version}; Three ${three.version}; ${files.size} files; ${bytes} bytes`);
console.log('PASS generated imports, HTML/CSS entries and worker references resolve; no external module imports or .ts URLs');
console.log('Retained source HTML asset URLs unchanged; models/fonts are delivery inputs, not copied by this builder.');
