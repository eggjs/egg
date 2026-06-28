import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = promisify(execFile);

// Repo root: tools/egg-bundler/test -> ../../.. . `packages/egg` resolves urllib
// (egg's direct dep), through which the prelude installer reaches undici under pnpm.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// REAL @utoo/pack build regression test for the snapshot lazy-external mechanism.
//
// The mechanism hinges on @utoo/pack emitting a `function externalRequire(id, thunk,
// ...)` helper for external module ids — a property of @utoo/pack's codegen a mock
// cannot guard. This runs a real build over an entry that requires `node:http`, then
// proves:
//   1. the prelude is prepended and the lazy hook is injected into the real
//      externalRequire body;
//   2. at BUILD context (no __RUNTIME_REQUIRE) http is a stub — http.METHODS is the
//      hardcoded constant and http.createServer() no-ops, so the real
//      (non-serializable) http module is never loaded;
//   3. at RESTORE context (__RUNTIME_REQUIRE installed) the same proxy forwards to
//      the real http — http.createServer() returns a real Server.

const mocks = vi.hoisted(() => ({
  workerEntry: '',
  entryDir: '',
}));

vi.mock('../src/lib/ManifestLoader.ts', () => ({
  ManifestLoader: vi.fn().mockImplementation(function () {
    return {
      load: async () => undefined,
      get manifest() {
        return {
          version: 1,
          generatedAt: '2026-01-01T00:00:00.000Z',
          invalidation: {
            lockfileFingerprint: '',
            configFingerprint: '',
            serverEnv: 'prod',
            serverScope: '',
            typescriptEnabled: true,
          },
          extensions: {},
          resolveCache: {},
          fileDiscovery: {},
        };
      },
      get store() {
        return {};
      },
      getAllDiscoveredFiles: () => [],
      getTeggDecoratedFiles: () => [],
    };
  }),
}));

vi.mock('../src/lib/ExternalsResolver.ts', () => ({
  ExternalsResolver: vi.fn().mockImplementation(function () {
    return { resolve: async () => ({}) };
  }),
}));

vi.mock('../src/lib/EntryGenerator.ts', () => ({
  EntryGenerator: vi.fn().mockImplementation(function () {
    return {
      generate: async () => ({ workerEntry: mocks.workerEntry, entryDir: mocks.entryDir }),
    };
  }),
}));

import { bundle } from '../src/index.ts';
import { SNAPSHOT_PRELUDE_MARKER } from '../src/lib/prelude.ts';

describe('snapshot lazy-external — real @utoo/pack build', () => {
  let baseDir: string;

  beforeEach(async () => {
    // realpath: on macOS os.tmpdir() is a /var -> /private/var symlink and Turbopack's
    // path math rejects the mismatch.
    baseDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-snaplazy-rb-')));
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('lazy-externalizes node:http: stub at build, real module after __RUNTIME_REQUIRE', async () => {
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'snaplazy-rb-app' }));

    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    // CommonJS require mirrors how egg's real http consumers (urllib/undici, node
    // internals) load the network stack: externalRequire returns the live lazy proxy
    // directly, with no ESM interop namespace copy in between.
    await fs.writeFile(
      entry,
      [
        '// @ts-nocheck',
        'const http = require("node:http");',
        'const g = globalThis;',
        'const probe = {',
        '  methodsHasGet: Array.isArray(http.METHODS) && http.METHODS.includes("GET"),',
        '  maxHeaderSize: http.maxHeaderSize,',
        '  createServerCall: typeof http.createServer(),',
        '  restored: !!g.__RUNTIME_REQUIRE,',
        '};',
        'process.stdout.write(JSON.stringify(probe));',
        '',
      ].join('\n'),
    );
    mocks.workerEntry = entry;
    mocks.entryDir = entryDir;

    const outputDir = path.join(baseDir, 'dist');
    // top-level snapshot:true forces single-file + prepend + lazy-external.
    await bundle({ baseDir, outputDir, snapshot: true });

    const workerPath = path.join(outputDir, 'worker.js');
    const worker = await fs.readFile(workerPath, 'utf8');

    expect(worker).toContain(SNAPSHOT_PRELUDE_MARKER);
    // @utoo/pack really emitted externalRequire and the hook landed inside it.
    expect(worker).toMatch(/function\s+externalRequire\s*\(/);
    expect(worker).toMatch(
      /globalThis\.__LAZY_EXT\.has\([A-Za-z_$][\w$]*\) \|\| !globalThis\.__isBuiltin\([A-Za-z_$][\w$]*\)\)\) return globalThis\.__makeLazyExt\(/,
    );

    // The injected + prepended source is still valid JS.
    await execFileAsync(process.execPath, ['--check', workerPath]);

    // BUILD context: run worker.js directly. http must be the stub.
    const built = await execFileAsync(process.execPath, [workerPath], { cwd: outputDir });
    expect(JSON.parse(built.stdout)).toEqual({
      methodsHasGet: true, // __HTTP_CONSTS.METHODS (read from build Node), real http never loaded
      maxHeaderSize: 16384, // __HTTP_CONSTS.maxHeaderSize, real http never loaded
      createServerCall: 'object', // build: a call-result member-proxy uses an object target (typeof 'object', mirroring the real instance); still chainable for x.y(z).w
      restored: false,
    });

    // RESTORE context: install __RUNTIME_REQUIRE before the worker runs, exactly as
    // the generated snapshot deserialize main would. The same proxy forwards to real http.
    const runner = path.join(outputDir, 'restore-runner.cjs');
    await fs.writeFile(
      runner,
      [
        'const { createRequire } = require("node:module");',
        'globalThis.__RUNTIME_REQUIRE = createRequire(__filename);',
        'require("./worker.js");',
        '',
      ].join('\n'),
    );
    const restored = await execFileAsync(process.execPath, [runner], { cwd: outputDir });
    const restoreProbe = JSON.parse(restored.stdout);
    expect(restoreProbe.restored).toBe(true);
    expect(restoreProbe.methodsHasGet).toBe(true); // real http.METHODS also has GET
    expect(restoreProbe.createServerCall).toBe('object'); // real http.createServer() -> Server
  }, 60_000);

  it('re-installs the web globals (fetch/Headers/Blob) backed by real undici at restore', async () => {
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'snaplazy-rb-wg-app' }));

    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    // The prelude (prepended by bundle()) stubs the web globals at load. This entry
    // simulates the snapshot restore-main: it calls __installWebGlobalsLazy (the
    // restore-runner installs __RUNTIME_REQUIRE first), then exercises the now-real
    // fetch/Headers/Blob against a local server.
    await fs.writeFile(
      entry,
      [
        '// @ts-nocheck',
        "if (typeof globalThis.__installWebGlobalsLazy === 'function') globalThis.__installWebGlobalsLazy();",
        '(async () => {',
        "  const http = globalThis.__RUNTIME_REQUIRE('node:http');",
        "  const server = http.createServer((req, res) => res.end('pong'));",
        "  await new Promise((r) => server.listen(0, '127.0.0.1', r));",
        '  const port = server.address().port;',
        '  const out = { installerPresent: typeof globalThis.__installWebGlobalsLazy, fetchType: typeof globalThis.fetch, BlobType: typeof globalThis.Blob };',
        '  try {',
        "    const resp = await fetch('http://127.0.0.1:' + port + '/');",
        '    out.body = await resp.text();',
        "    out.headerOk = new Headers({ x: '1' }).get('x') === '1';",
        "    out.blobText = await new Blob(['z']).text();",
        '  } catch (e) { out.err = String((e && e.message) || e); }',
        '  await new Promise((r) => server.close(r));',
        "  process.stdout.write('WGPROBE:' + JSON.stringify(out), () => process.exit(0));",
        '})();',
        '',
      ].join('\n'),
    );
    mocks.workerEntry = entry;
    mocks.entryDir = entryDir;

    const outputDir = path.join(baseDir, 'dist');
    await bundle({ baseDir, outputDir, snapshot: true });

    // Restore-runner installs __RUNTIME_REQUIRE (with resolve) pointing where
    // urllib/undici live, exactly as the generated deserialize main would.
    const runner = path.join(outputDir, 'wg-restore-runner.cjs');
    await fs.writeFile(
      runner,
      [
        'const { createRequire } = require("node:module");',
        'const req = createRequire(process.env.EGG_TEST_REQUIRE_BASE);',
        'const rt = (id) => req(id);',
        'rt.resolve = (id, o) => req.resolve(id, o);',
        'globalThis.__RUNTIME_REQUIRE = rt;',
        'require("./worker.js");',
        '',
      ].join('\n'),
    );
    const ran = await execFileAsync(process.execPath, [runner], {
      cwd: outputDir,
      env: { ...process.env, EGG_TEST_REQUIRE_BASE: path.join(REPO_ROOT, 'packages/egg', 'package.json') },
    });
    const marker = 'WGPROBE:';
    const probe = JSON.parse(ran.stdout.slice(ran.stdout.indexOf(marker) + marker.length));

    expect(probe.installerPresent).toBe('function'); // prelude defined it
    expect(probe.fetchType).toBe('function'); // re-installed, not the WebGlobalStub
    expect(probe.body).toBe('pong'); // a real fetch round-trip works
    expect(probe.headerOk).toBe(true); // real undici Headers
    expect(probe.BlobType).toBe('function');
    expect(probe.blobText).toBe('z'); // real node:buffer Blob
  }, 60_000);

  it('forced-external npm package: class extends pkg.Base is a stub at build, real base after restore', async () => {
    // The scenario this PR's undici/urllib defaults enable: a bundled module extends a
    // class exported by a forced-external npm package (egg's
    // `class HttpClient extends urllib.HttpClient`). The `extends` clause is evaluated
    // at BUILD time against the member-proxy stub; at RESTORE the member-proxy replays
    // the access path against the real module, so `super(...)` and inherited methods
    // resolve to the real base class. A local `lazy-base` package stands in for urllib
    // so the test stays hermetic (ExternalsResolver is mocked, so it is forced external
    // only via egg.snapshot.lazyModules).
    await fs.writeFile(
      path.join(baseDir, 'package.json'),
      JSON.stringify({ name: 'snaplazy-extends-app', egg: { snapshot: { lazyModules: ['lazy-base'] } } }),
    );
    const basePkgDir = path.join(baseDir, 'node_modules', 'lazy-base');
    await fs.mkdir(basePkgDir, { recursive: true });
    await fs.writeFile(path.join(basePkgDir, 'package.json'), JSON.stringify({ name: 'lazy-base', main: 'index.js' }));
    await fs.writeFile(
      path.join(basePkgDir, 'index.js'),
      [
        // Module-eval load counter: lets the runners prove WHEN the real package is
        // actually loaded (it must be never at build, and only at restore once the
        // member-proxy resolves through the lazy hook — not via native resolution).
        'globalThis.__LAZY_BASE_LOADS = (globalThis.__LAZY_BASE_LOADS || 0) + 1;',
        'class Base {',
        '  constructor(opt) { this.opt = opt; }',
        "  greet() { return 'base#' + this.opt; }",
        '}',
        'module.exports = { Base };',
        '',
      ].join('\n'),
    );

    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    await fs.writeFile(
      entry,
      [
        '// @ts-nocheck',
        // captured at module-eval; the `extends` link freezes against whatever this is
        "const { Base } = require('lazy-base');",
        'class Sub extends Base {',
        '  constructor(opt) { super(opt); this.tag = "sub"; }',
        '  describe() { return this.tag + ":" + this.greet(); }',
        '}',
        // defer instantiation so the runner controls the build/restore boundary
        'globalThis.__makeSub = (n) => new Sub(n);',
        'process.stdout.write("ENTRY_OK");',
        '',
      ].join('\n'),
    );
    mocks.workerEntry = entry;
    mocks.entryDir = entryDir;

    const outputDir = path.join(baseDir, 'dist');
    await bundle({ baseDir, outputDir, snapshot: true });

    const workerPath = path.join(outputDir, 'worker.js');
    const worker = await fs.readFile(workerPath, 'utf8');
    expect(worker).toContain(SNAPSHOT_PRELUDE_MARKER);
    expect(worker).toMatch(/function\s+externalRequire\s*\(/);
    await execFileAsync(process.execPath, ['--check', workerPath]);

    const basePathLiteral = JSON.stringify(basePkgDir);

    // BUILD context: define + construct the subclass with no __RUNTIME_REQUIRE. The base
    // is the member-proxy stub, so the instance is not a real lazy-base instance, nothing
    // throws, and crucially the real lazy-base module is NEVER loaded (realLoads === 0) —
    // proving the bundle used the build-time stub rather than resolving the package.
    const buildRunner = path.join(outputDir, 'build-runner.cjs');
    await fs.writeFile(
      buildRunner,
      [
        'const probe = { phase: "build" };',
        'try {',
        '  require("./worker.js");',
        '  globalThis.__makeSub(7);',
        '  probe.restored = !!globalThis.__RUNTIME_REQUIRE;',
        '  probe.realLoads = globalThis.__LAZY_BASE_LOADS || 0;',
        '  probe.threw = false;',
        '} catch (e) { probe.threw = true; probe.err = e.message; }',
        'process.stdout.write("\\n" + JSON.stringify(probe));',
        '',
      ].join('\n'),
    );
    const built = await execFileAsync(process.execPath, [buildRunner], { cwd: outputDir });
    expect(JSON.parse(built.stdout.split('\n').pop() ?? '')).toMatchObject({
      restored: false,
      threw: false,
      realLoads: 0, // real lazy-base never loaded at build
    });

    // RESTORE context (cross-phase, one process): require worker.js with __RUNTIME_REQUIRE
    // still unset (freezing `extends` against the stub), THEN install it, THEN instantiate.
    // The load counters prove the real lazy-base is pulled in ONLY when the member-proxy
    // resolves through the `__RUNTIME_REQUIRE` hook (loadedBeforeMakeSub === 0,
    // loadedAfterMakeSub === 1) — i.e. via the lazy hook, not native pre-resolution.
    //
    // `instanceof Base` is intentionally NOT asserted: makeMember's `protoProxy` exposes
    // only a `get` trap (no `getPrototypeOf`), so inherited methods forward to the real
    // prototype but the snapshot-frozen subclass's prototype chain does not literally
    // contain the real `Base.prototype` — identity-by-prototype is a known non-goal of the
    // upstream member-proxy.
    const restoreRunner = path.join(outputDir, 'restore-runner.cjs');
    await fs.writeFile(
      restoreRunner,
      [
        'require("./worker.js");',
        'const loadedBeforeRT = globalThis.__LAZY_BASE_LOADS || 0;',
        `globalThis.__RUNTIME_REQUIRE = (id) => id === "lazy-base" ? require(${basePathLiteral}) : require(id);`,
        'const loadedBeforeMakeSub = globalThis.__LAZY_BASE_LOADS || 0;',
        'const inst = globalThis.__makeSub(7);',
        'const probe = {',
        '  restored: true,',
        '  loadedBeforeRT,',
        '  loadedBeforeMakeSub,',
        '  loadedAfterMakeSub: globalThis.__LAZY_BASE_LOADS || 0,',
        '  tag: inst.tag,',
        '  greet: inst.greet(),',
        '  describe: inst.describe(),',
        '};',
        'process.stdout.write("\\n" + JSON.stringify(probe));',
        '',
      ].join('\n'),
    );
    const restored = await execFileAsync(process.execPath, [restoreRunner], { cwd: outputDir });
    expect(JSON.parse(restored.stdout.split('\n').pop() ?? '')).toEqual({
      restored: true,
      loadedBeforeRT: 0, // building the worker did not load the real module
      loadedBeforeMakeSub: 0, // installing __RUNTIME_REQUIRE does not eagerly load it
      loadedAfterMakeSub: 1, // loaded exactly once, when the member-proxy resolved via the hook
      tag: 'sub', // subclass constructor ran
      greet: 'base#7', // inherited real method + real field (opt=7) — real base constructed
      describe: 'sub:base#7', // subclass method invoking the inherited one
    });
  }, 60_000);
});
