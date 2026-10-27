// Executes the actual patched retained TypeScript directly. No emitted files or bundle writes.
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname } from 'node:path';
import { HOST_FILES } from './retained-host-wiring.mjs';

export const retainedRoot = new URL('../source/games/wings/', import.meta.url);

export function installRetainedHostLoader() {
  const loaded = new Set();
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('.') && context.parentURL?.startsWith(retainedRoot.href) && !extname(specifier)) {
        const target = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(target)) return { url: target.href, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (!url.startsWith(retainedRoot.href) || !url.endsWith('.ts')) return nextLoad(url, context);
      const relativePath = url.slice(retainedRoot.href.length);
      const source = readFileSync(fileURLToPath(url), 'utf8');
      if (HOST_FILES.includes(relativePath)) loaded.add(relativePath);
      return { format: 'module', shortCircuit: true,
        source: stripTypeScriptTypes(source, { mode: 'transform', sourceUrl: url }) };
    },
  });
  return { loaded, dispose: () => hooks.deregister() };
}
