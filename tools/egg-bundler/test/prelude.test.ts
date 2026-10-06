import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import { prependSnapshotPrelude, renderSnapshotPrelude, SNAPSHOT_PRELUDE_MARKER } from '../src/lib/prelude.ts';

describe('snapshot prelude', () => {
  it('renders a marked placeholder block', () => {
    const prelude = renderSnapshotPrelude();
    expect(prelude).toContain(SNAPSHOT_PRELUDE_MARKER);
    expect(prelude).toContain('eggBundlerSnapshotPrelude');
    // ends with a newline so it cleanly precedes the bundle IIFE
    expect(prelude.endsWith('\n')).toBe(true);
  });

  it('plain runtime installs a real require hook and leaves web globals untouched', () => {
    const fetch = () => undefined;
    let requireBase: string | undefined;
    const runtimeRequire = Object.assign((id: string) => `module:${id}`, {
      resolve: (id: string) => `/resolved/${id}`,
    });
    const sandbox: Record<string, any> = {
      __filename: '/app/dist-bundle/worker.js',
      fetch,
      process: {
        getBuiltinModule(id: string) {
          if (id === 'node:v8') return { startupSnapshot: { isBuildingSnapshot: () => false } };
          if (id === 'node:module') {
            return {
              createRequire(base: string) {
                requireBase = base;
                return runtimeRequire;
              },
            };
          }
          throw new Error(`unexpected builtin: ${id}`);
        },
      },
    };
    vm.createContext(sandbox);
    vm.runInContext(renderSnapshotPrelude(), sandbox);

    expect(requireBase).toBe('/app/dist-bundle/worker.js');
    expect(sandbox.__RUNTIME_REQUIRE('mysql2')).toBe('module:mysql2');
    expect(sandbox.__RUNTIME_REQUIRE.resolve('mysql2')).toBe('/resolved/mysql2');
    expect(sandbox.fetch).toBe(fetch);
    expect(sandbox.__LAZY_EXT).toBeUndefined();
    expect(sandbox.__makeLazyExt).toBeUndefined();
  });

  it('memoizes a resolved call-result member proxy', () => {
    const sandbox: Record<string, any> = {
      process: {
        getBuiltinModule(id: string) {
          if (id === 'node:v8') return { startupSnapshot: { isBuildingSnapshot: () => true } };
          if (id === 'node:module') return { isBuiltin: () => false };
          throw new Error(`unexpected builtin: ${id}`);
        },
      },
    };
    vm.createContext(sandbox);
    vm.runInContext(renderSnapshotPrelude(['lazy-package'], { 'lazy-package': ['createValue'] }), sandbox);

    const lazyModule = sandbox.__makeLazyExt('lazy-package');
    const value = lazyModule.createValue();
    let createCount = 0;
    sandbox.__RUNTIME_REQUIRE = () => ({
      createValue() {
        createCount++;
        return {};
      },
    });

    value.custom = 1;
    expect(value.custom).toBe(1);
    expect(createCount).toBe(1);
  });

  it('prepends the prelude before the bundle IIFE', () => {
    const bundle = '((__UTOOPACK__)=>{/* modules */})([]);\n';
    const out = prependSnapshotPrelude(bundle);
    expect(out.startsWith(renderSnapshotPrelude())).toBe(true);
    expect(out).toContain(bundle);
    // prelude precedes the IIFE
    expect(out.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeLessThan(out.indexOf('__UTOOPACK__'));
  });

  it('is idempotent: a second prepend does not duplicate the prelude', () => {
    const bundle = '((__UTOOPACK__)=>{})([]);\n';
    const once = prependSnapshotPrelude(bundle);
    const twice = prependSnapshotPrelude(once);
    expect(twice).toBe(once);
    const occurrences = twice.split(SNAPSHOT_PRELUDE_MARKER).length - 1;
    expect(occurrences).toBe(1);
  });

  it('keeps a leading shebang on the first line', () => {
    const bundle = '#!/usr/bin/env node\n((__UTOOPACK__)=>{})([]);\n';
    const out = prependSnapshotPrelude(bundle);
    expect(out.startsWith('#!/usr/bin/env node\n')).toBe(true);
    expect(out.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeGreaterThan(0);
    expect(out.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeLessThan(out.indexOf('__UTOOPACK__'));
  });

  it('keeps a leading "use strict" directive ahead of the prelude', () => {
    const bundle = '"use strict";\n((__UTOOPACK__)=>{})([]);\n';
    const out = prependSnapshotPrelude(bundle);
    expect(out.startsWith('"use strict";\n')).toBe(true);
    const marker = out.indexOf(SNAPSHOT_PRELUDE_MARKER);
    expect(marker).toBeGreaterThan('"use strict";'.length);
    expect(marker).toBeLessThan(out.indexOf('__UTOOPACK__'));
  });
});
