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
      generate: async () => ({
        entries: [{ name: 'worker' as const, filepath: mocks.workerEntry }],
        entryDir: mocks.entryDir,
      }),
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

  it('uses the same artifact for plain execution, snapshot build, and restore', async () => {
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'snaplazy-rb-app' }));

    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    const requireBase = JSON.stringify(path.join(baseDir, 'package.json'));
    // CommonJS require mirrors Egg's real HTTP consumers. The entry uses Node's
    // actual startup-snapshot state and emits a probe in each of the three phases.
    await fs.writeFile(
      entry,
      [
        '// @ts-nocheck',
        'const v8 = process.getBuiltinModule("node:v8");',
        'const http = require("node:http");',
        'const probe = () => ({',
        '  methodsHasGet: Array.isArray(http.METHODS) && http.METHODS.includes("GET"),',
        '  maxHeaderSize: http.maxHeaderSize,',
        '  createServerCall: typeof http.createServer(),',
        '  runtimeRequire: !!globalThis.__RUNTIME_REQUIRE,',
        '});',
        'const emit = (phase) => process.stdout.write(phase + ":" + JSON.stringify(probe()) + "\\n");',
        'if (v8.startupSnapshot.isBuildingSnapshot()) {',
        '  emit("BUILD");',
        '  v8.startupSnapshot.setDeserializeMainFunction(() => {',
        '    const { createRequire } = process.getBuiltinModule("node:module");',
        `    const req = createRequire(${requireBase});`,
        '    const rt = (id) => req(id);',
        '    rt.resolve = (id, options) => req.resolve(id, options);',
        '    globalThis.__RUNTIME_REQUIRE = rt;',
        '    emit("RESTORE");',
        '  });',
        '} else {',
        '  emit("PLAIN");',
        '};',
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

    // Plain execution is not snapshot construction: the prelude installs a real
    // require hook before the bundle IIFE and node:http loads normally.
    const plain = await execFileAsync(process.execPath, [workerPath], { cwd: outputDir });
    expect(JSON.parse(plain.stdout.slice('PLAIN:'.length))).toEqual({
      methodsHasGet: true,
      maxHeaderSize: 16384,
      createServerCall: 'object',
      runtimeRequire: true,
    });

    // Snapshot construction is selected by Node itself, not an environment flag.
    const blobPath = path.join(outputDir, 'worker.snapshot.blob');
    const built = await execFileAsync(process.execPath, ['--snapshot-blob', blobPath, '--build-snapshot', workerPath], {
      cwd: outputDir,
    });
    const buildMarker = 'BUILD:';
    const buildProbe = JSON.parse(built.stdout.slice(built.stdout.lastIndexOf(buildMarker) + buildMarker.length));
    expect(buildProbe).toEqual({
      methodsHasGet: true, // __HTTP_CONSTS.METHODS (read from build Node), real http never loaded
      maxHeaderSize: 16384, // __HTTP_CONSTS.maxHeaderSize, real http never loaded
      createServerCall: 'object', // build: a call-result member-proxy uses an object target (typeof 'object', mirroring the real instance); still chainable for x.y(z).w
      runtimeRequire: false,
    });

    // Restore does not re-run the top-level file. V8 invokes the serialized
    // deserialize main, which installs the runtime require before using the proxy.
    const restored = await execFileAsync(process.execPath, ['--snapshot-blob', blobPath], { cwd: outputDir });
    const restoreMarker = 'RESTORE:';
    const restoreProbe = JSON.parse(
      restored.stdout.slice(restored.stdout.lastIndexOf(restoreMarker) + restoreMarker.length),
    );
    expect(restoreProbe.runtimeRequire).toBe(true);
    expect(restoreProbe.methodsHasGet).toBe(true); // real http.METHODS also has GET
    expect(restoreProbe.createServerCall).toBe('object'); // real http.createServer() -> Server
  }, 60_000);

  it('re-installs the web globals (fetch/Headers/Blob) backed by real undici at restore', async () => {
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'snaplazy-rb-wg-app' }));

    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    const requireBase = JSON.stringify(path.join(REPO_ROOT, 'packages/egg', 'package.json'));
    // The real snapshot build serializes the restore-only installer. The
    // deserialize main installs runtime require first, then exercises the real
    // undici-backed globals without opening a network listener.
    await fs.writeFile(
      entry,
      [
        '// @ts-nocheck',
        'const v8 = process.getBuiltinModule("node:v8");',
        'if (v8.startupSnapshot.isBuildingSnapshot()) {',
        '  v8.startupSnapshot.setDeserializeMainFunction(() => {',
        '    const { createRequire } = process.getBuiltinModule("node:module");',
        `    const req = createRequire(${requireBase});`,
        '    const rt = (id) => req(id);',
        '    rt.resolve = (id, options) => req.resolve(id, options);',
        '    globalThis.__RUNTIME_REQUIRE = rt;',
        '    globalThis.__installWebGlobalsLazy();',
        '    setImmediate(async () => {',
        '      const out = { installerPresent: typeof globalThis.__installWebGlobalsLazy, fetchType: typeof globalThis.fetch, BlobType: typeof globalThis.Blob };',
        '      try {',
        "        const resp = await fetch('data:text/plain,pong');",
        '        out.body = await resp.text();',
        "        out.headerOk = new Headers({ x: '1' }).get('x') === '1';",
        "        out.blobText = await new Blob(['z']).text();",
        '      } catch (e) { out.err = String((e && e.message) || e); }',
        "      process.stdout.write('WGPROBE:' + JSON.stringify(out), () => process.exit(0));",
        '    });',
        '  });',
        '}',
        '',
      ].join('\n'),
    );
    mocks.workerEntry = entry;
    mocks.entryDir = entryDir;

    const outputDir = path.join(baseDir, 'dist');
    await bundle({ baseDir, outputDir, snapshot: true });

    const workerPath = path.join(outputDir, 'worker.js');
    const blobPath = path.join(outputDir, 'worker.snapshot.blob');
    await execFileAsync(process.execPath, ['--snapshot-blob', blobPath, '--build-snapshot', workerPath], {
      cwd: outputDir,
    });
    const ran = await execFileAsync(process.execPath, ['--snapshot-blob', blobPath], { cwd: outputDir });
    const marker = 'WGPROBE:';
    const probe = JSON.parse(ran.stdout.slice(ran.stdout.indexOf(marker) + marker.length));

    expect(probe.installerPresent).toBe('function'); // prelude defined it
    expect(probe.fetchType).toBe('function'); // re-installed, not the WebGlobalStub
    expect(probe.body).toBe('pong'); // a real undici fetch works
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
        'const v8 = process.getBuiltinModule("node:v8");',
        // captured at module-eval; the `extends` link freezes against whatever this is
        "const { Base } = require('lazy-base');",
        'class Sub extends Base {',
        '  constructor(opt) { super(opt); this.tag = "sub"; }',
        '  describe() { return this.tag + ":" + this.greet(); }',
        '}',
        'const fullProbe = () => {',
        '  const inst = new Sub(7);',
        '  return {',
        '    runtimeRequire: !!globalThis.__RUNTIME_REQUIRE,',
        '    realLoads: globalThis.__LAZY_BASE_LOADS || 0,',
        '    tag: inst.tag,',
        '    greet: inst.greet(),',
        '    describe: inst.describe(),',
        '  };',
        '};',
        'if (v8.startupSnapshot.isBuildingSnapshot()) {',
        '  const buildProbe = { runtimeRequire: !!globalThis.__RUNTIME_REQUIRE, realLoads: globalThis.__LAZY_BASE_LOADS || 0 };',
        '  new Sub(7);',
        '  buildProbe.realLoadsAfterConstruct = globalThis.__LAZY_BASE_LOADS || 0;',
        '  process.stdout.write("BUILD:" + JSON.stringify(buildProbe) + "\\n");',
        '  v8.startupSnapshot.setDeserializeMainFunction(() => {',
        '    const { createRequire } = process.getBuiltinModule("node:module");',
        `    const req = createRequire(${JSON.stringify(path.join(baseDir, 'package.json'))});`,
        '    const rt = (id) => req(id);',
        '    rt.resolve = (id, options) => req.resolve(id, options);',
        '    globalThis.__RUNTIME_REQUIRE = rt;',
        '    process.stdout.write("RESTORE:" + JSON.stringify(fullProbe()) + "\\n");',
        '  });',
        '} else {',
        '  process.stdout.write("PLAIN:" + JSON.stringify(fullProbe()) + "\\n");',
        '}',
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

    // Plain mode bypasses every build stub. The prelude installs runtime require
    // before the IIFE, so the external package is loaded and the class is ordinary.
    const plain = await execFileAsync(process.execPath, [workerPath], { cwd: outputDir });
    expect(JSON.parse(plain.stdout.slice('PLAIN:'.length))).toEqual({
      runtimeRequire: true,
      realLoads: 1,
      tag: 'sub',
      greet: 'base#7',
      describe: 'sub:base#7',
    });

    // During a real snapshot build, `extends` sees the member proxy and even
    // construction must not load the external package.
    const blobPath = path.join(outputDir, 'worker.snapshot.blob');
    const built = await execFileAsync(process.execPath, ['--snapshot-blob', blobPath, '--build-snapshot', workerPath], {
      cwd: outputDir,
    });
    const buildMarker = 'BUILD:';
    expect(JSON.parse(built.stdout.slice(built.stdout.lastIndexOf(buildMarker) + buildMarker.length))).toEqual({
      runtimeRequire: false,
      realLoads: 0,
      realLoadsAfterConstruct: 0,
    });

    // `instanceof Base` is intentionally NOT asserted: makeMember's `protoProxy` exposes
    // only a `get` trap (no `getPrototypeOf`), so inherited methods forward to the real
    // prototype but the snapshot-frozen subclass's prototype chain does not literally
    // contain the real `Base.prototype` — identity-by-prototype is a known non-goal.
    //
    // Restore keeps the snapshot-frozen subclass but resolves its base lazily
    // through the runtime hook on first construction.
    const restored = await execFileAsync(process.execPath, ['--snapshot-blob', blobPath], { cwd: outputDir });
    const restoreMarker = 'RESTORE:';
    expect(
      JSON.parse(restored.stdout.slice(restored.stdout.lastIndexOf(restoreMarker) + restoreMarker.length)),
    ).toEqual({
      runtimeRequire: true,
      realLoads: 1,
      tag: 'sub', // subclass constructor ran
      greet: 'base#7', // inherited real method + real field (opt=7) — real base constructed
      describe: 'sub:base#7', // subclass method invoking the inherited one
    });
  }, 60_000);
});
