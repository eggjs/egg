import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SNAPSHOT_LAZY_MODULES,
  injectExternalRequireLazyHook,
  renderSnapshotPrelude,
  resolveSnapshotLazyModules,
} from '../src/lib/prelude.ts';

describe('snapshot lazy-external', () => {
  describe('resolveSnapshotLazyModules', () => {
    let tmp: string;

    beforeEach(async () => {
      tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-lazy-'));
    });
    afterEach(async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    });

    it('returns the default network-stack list when package.json is absent', async () => {
      const result = await resolveSnapshotLazyModules(tmp);
      expect(result).toEqual([...DEFAULT_SNAPSHOT_LAZY_MODULES]);
      expect(result).toContain('http');
      expect(result).toContain('node:http2');
      expect(result).toContain('node:dns');
    });

    it('returns the default list when package.json has no egg.snapshot.lazyModules', async () => {
      await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ name: 'app', egg: {} }));
      expect(await resolveSnapshotLazyModules(tmp)).toEqual([...DEFAULT_SNAPSHOT_LAZY_MODULES]);
    });

    it('appends app egg.snapshot.lazyModules onto the default list, deduped and order-preserving', async () => {
      await fs.writeFile(
        path.join(tmp, 'package.json'),
        JSON.stringify({
          name: 'app',
          egg: { snapshot: { lazyModules: ['leoric', 'http', '@elastic/elasticsearch', 'leoric'] } },
        }),
      );
      const result = await resolveSnapshotLazyModules(tmp);
      expect(result.slice(0, DEFAULT_SNAPSHOT_LAZY_MODULES.length)).toEqual([...DEFAULT_SNAPSHOT_LAZY_MODULES]);
      expect(result.filter((m) => m === 'http')).toHaveLength(1);
      expect(result.slice(DEFAULT_SNAPSHOT_LAZY_MODULES.length)).toEqual(['leoric', '@elastic/elasticsearch']);
    });

    it('ignores a malformed (non-array) lazyModules field', async () => {
      await fs.writeFile(
        path.join(tmp, 'package.json'),
        JSON.stringify({ egg: { snapshot: { lazyModules: 'http' } } }),
      );
      expect(await resolveSnapshotLazyModules(tmp)).toEqual([...DEFAULT_SNAPSHOT_LAZY_MODULES]);
    });

    it('skips non-string / empty entries inside lazyModules', async () => {
      await fs.writeFile(
        path.join(tmp, 'package.json'),
        JSON.stringify({ egg: { snapshot: { lazyModules: ['ok', '', 42, null, 'ok2'] } } }),
      );
      const result = await resolveSnapshotLazyModules(tmp);
      expect(result.slice(DEFAULT_SNAPSHOT_LAZY_MODULES.length)).toEqual(['ok', 'ok2']);
    });

    it('returns the default list when package.json is invalid JSON', async () => {
      await fs.writeFile(path.join(tmp, 'package.json'), '{ not json');
      expect(await resolveSnapshotLazyModules(tmp)).toEqual([...DEFAULT_SNAPSHOT_LAZY_MODULES]);
    });
  });

  describe('renderSnapshotPrelude (lazy body)', () => {
    it('deletes Node lazy web globals with delete (not defineProperty)', () => {
      const prelude = renderSnapshotPrelude();
      expect(prelude).toContain('delete globalThis[');
      expect(prelude).not.toContain('Object.defineProperty');
      for (const g of ['fetch', 'Headers', 'Request', 'Response', 'FormData', 'WebSocket', 'File', 'Blob']) {
        expect(prelude).toContain(JSON.stringify(g));
      }
    });

    it('installs __LAZY_EXT with every lazy id and the __makeLazyExt factory', () => {
      const prelude = renderSnapshotPrelude(['http', 'node:http', 'custom-pkg']);
      expect(prelude).toContain('globalThis.__LAZY_EXT = new Set(');
      expect(prelude).toContain('globalThis.__makeLazyExt = function');
      expect(prelude).toContain('"custom-pkg"');
      expect(prelude).toContain('globalThis.__RUNTIME_REQUIRE');
    });

    it('hardcodes http METHODS / STATUS_CODES / maxHeaderSize', () => {
      const prelude = renderSnapshotPrelude();
      expect(prelude).toContain('"GET"');
      expect(prelude).toContain('"POST"');
      expect(prelude).toContain('"200"');
      expect(prelude).toContain('16384');
    });
  });

  describe('injectExternalRequireLazyHook', () => {
    it('injects the lazy dispatch using the helper parameter names', () => {
      const src = 'function externalRequire(id, thunk, esm = false) { return thunk(); }';
      const { content, injected } = injectExternalRequireLazyHook(src);
      expect(injected).toBe(1);
      expect(content).toContain(
        'if (globalThis.__LAZY_EXT && globalThis.__LAZY_EXT.has(id)) return globalThis.__makeLazyExt(id, thunk);',
      );
      expect(content.indexOf('__makeLazyExt')).toBeLessThan(content.indexOf('return thunk()'));
    });

    it('respects renamed parameters', () => {
      const src = 'function externalRequire(a,b,c=false){return b();}';
      const { content, injected } = injectExternalRequireLazyHook(src);
      expect(injected).toBe(1);
      expect(content).toContain('globalThis.__LAZY_EXT.has(a)) return globalThis.__makeLazyExt(a, b);');
    });

    it('injects into every externalRequire occurrence', () => {
      const src =
        'function externalRequire(id, thunk){return id;}\nfunction externalRequire(id2, thunk2, esm=false){return id2;}';
      const { injected } = injectExternalRequireLazyHook(src);
      expect(injected).toBe(2);
    });

    it('returns the input untouched when there is no externalRequire', () => {
      const src = 'function notExternal(id, thunk) { return thunk(); }';
      const { content, injected } = injectExternalRequireLazyHook(src);
      expect(injected).toBe(0);
      expect(content).toBe(src);
    });

    it('is idempotent: re-injecting already-injected output is a no-op', () => {
      const src = 'function externalRequire(id, thunk, esm = false) { return thunk(); }';
      const once = injectExternalRequireLazyHook(src);
      expect(once.injected).toBe(1);
      const twice = injectExternalRequireLazyHook(once.content);
      expect(twice.injected).toBe(0);
      expect(twice.content).toBe(once.content);
      // exactly one dispatch, no duplication
      expect(twice.content.split('__makeLazyExt(').length - 1).toBe(1);
    });
  });

  describe('runtime __makeLazyExt behavior (prelude evaluated in a vm)', () => {
    function makeContext(lazy: readonly string[]) {
      const sandbox: Record<string, unknown> = {};
      vm.createContext(sandbox);
      vm.runInContext(renderSnapshotPrelude(lazy), sandbox);
      const makeLazyExt = sandbox.__makeLazyExt as (id: string, thunk: unknown) => unknown;
      const lazySet = sandbox.__LAZY_EXT as Set<string>;
      return { sandbox, makeLazyExt, lazySet };
    }

    it('exposes __LAZY_EXT as a Set of the lazy ids', () => {
      const { lazySet } = makeContext(['http', 'node:http']);
      expect(lazySet.has('http')).toBe(true);
      expect(lazySet.has('node:http')).toBe(true);
      expect(lazySet.has('tls')).toBe(false);
    });

    it('build time: never loads the real module and returns hardcoded http constants', () => {
      const { makeLazyExt } = makeContext(['http']);
      const http = makeLazyExt('http', null) as Record<string, unknown>;
      const methods = [...(http.METHODS as string[])];
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect((http.STATUS_CODES as Record<string, string>)['404']).toBe('Not Found');
      expect(http.maxHeaderSize).toBe(16384);
    });

    it('build time: default resolves to the proxy itself and unknown props are chainable stubs', () => {
      const { makeLazyExt } = makeContext(['http']);
      const http = makeLazyExt('http', null) as Record<string, unknown>;
      expect(http.default).toBe(http);
      const deep = (http.Server as Record<string, unknown>).prototype;
      expect(deep).toBeDefined();
    });

    it('build time: calling / constructing a stub does not throw and never loads the module', () => {
      const { makeLazyExt, sandbox } = makeContext(['dns']);
      const dns = makeLazyExt('dns', null) as { lookup: (...a: unknown[]) => unknown };
      expect(() => dns.lookup('example.com')).not.toThrow();
      expect(sandbox.__RUNTIME_REQUIRE).toBeUndefined();
    });

    it('build time: a constructed stub stays chainable (new Agent().method())', () => {
      const { makeLazyExt } = makeContext(['http']);
      const http = makeLazyExt('http', null) as { Agent: new () => { addRequest: (...a: unknown[]) => unknown } };
      // new http.Agent().addRequest(...) must not hit undefined at build time
      expect(() => new http.Agent().addRequest({}, {})).not.toThrow();
    });

    it('build time: the stub is not thenable, so awaiting it does not hang', async () => {
      const { makeLazyExt } = makeContext(['http']);
      const http = makeLazyExt('http', null) as Record<string, unknown>;
      expect(http.then).toBeUndefined();
      // Promise.resolve checks thenability; a non-thenable stub resolves to itself.
      await expect(Promise.resolve(http)).resolves.toBe(http);
    });

    it('restore time: forwards every access to the real module via __RUNTIME_REQUIRE', () => {
      const { makeLazyExt, sandbox } = makeContext(['http']);
      const realHttp = { createServer: () => 'real-server', METHODS: ['REALGET'] };
      sandbox.__RUNTIME_REQUIRE = (id: string) => (id === 'http' ? realHttp : undefined);
      const http = makeLazyExt('http', null) as typeof realHttp;
      expect(http.createServer()).toBe('real-server');
      expect(http.METHODS).toEqual(['REALGET']);
    });

    it('restore time: structural traps reflect the real module exports', () => {
      const { makeLazyExt, sandbox } = makeContext(['http']);
      const realHttp = { createServer: () => 'srv', METHODS: ['GET'] };
      sandbox.__RUNTIME_REQUIRE = (id: string) => (id === 'http' ? realHttp : undefined);
      const http = makeLazyExt('http', null) as Record<string, unknown>;

      // Object.keys / getOwnPropertyDescriptor must see the real exports, not just
      // the dummy function target.
      expect(Object.keys(http)).toEqual(expect.arrayContaining(['createServer', 'METHODS']));
      expect(Object.getOwnPropertyDescriptor(http, 'createServer')).toBeDefined();
      // destructuring-rest iterates own enumerable keys -> must work over real http
      const { createServer, ...rest } = http as { createServer: unknown; METHODS: unknown };
      expect(typeof createServer).toBe('function');
      expect(rest.METHODS).toEqual(['GET']);
    });

    it('build time: structural reflection does not throw and exposes nothing real', () => {
      const { makeLazyExt } = makeContext(['tls']);
      const tls = makeLazyExt('tls', null) as object;
      expect(() => Object.keys(tls)).not.toThrow();
      expect(Object.keys(tls)).toEqual([]); // no real module loaded -> no exports
      expect(() => Object.getOwnPropertyDescriptor(tls, 'prototype')).not.toThrow();
      expect('prototype' in tls).toBe(true);
    });
  });
});
