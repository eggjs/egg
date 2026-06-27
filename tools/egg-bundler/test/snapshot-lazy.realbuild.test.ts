import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = promisify(execFile);

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
    expect(worker).toMatch(/globalThis\.__LAZY_EXT\.has\([A-Za-z_$][\w$]*\)\) return globalThis\.__makeLazyExt\(/);

    // The injected + prepended source is still valid JS.
    await execFileAsync(process.execPath, ['--check', workerPath]);

    // BUILD context: run worker.js directly. http must be the stub.
    const built = await execFileAsync(process.execPath, [workerPath], { cwd: outputDir });
    expect(JSON.parse(built.stdout)).toEqual({
      methodsHasGet: true, // hardcoded METHODS, real http never loaded
      maxHeaderSize: 16384, // hardcoded constant
      createServerCall: 'undefined', // apply trap no-ops at build time
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
});
