import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = promisify(execFile);

// REAL @utoo/pack build regression test for single-file (library/export) output mode,
// which is the DEFAULT output mode.
//
// The legacy `standalone` output (opt-in via `pack.singleFile: false`) emits a tiny
// `worker.js` loader that does `require("./_turbopack__runtime.js")` and pulls in
// sibling chunks via `R.c(...)` at runtime. A V8 startup snapshot builder forbids that
// user-land require of sibling chunks, so the default single-file mode switches
// @utoo/pack to `output.type: "export"` with a per-entry `library: { name }`, which
// inlines every module into one self-executing IIFE (`((__UTOOPACK__)=>{...})([...modules])`).
// This is a real build because the emitted shape is entirely a property of @utoo/pack's
// `export` codegen — a mock cannot guard a @utoo/pack upgrade that regresses it.

// ManifestLoader / ExternalsResolver / EntryGenerator are stubbed so the test can drive a
// real @utoo/pack build over a hand-written worker entry. Only the build is exercised for real.
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

describe('single-file output mode — real @utoo/pack build', () => {
  let baseDir: string;

  beforeEach(async () => {
    // realpath: on macOS os.tmpdir() is a /var -> /private/var symlink and Turbopack's
    // path math rejects the mismatch.
    baseDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-single-')));
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('defaults to a single self-contained worker.js with no sibling-chunk require, runnable by node', async () => {
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'single-file-app' }));

    // A small dependency graph forced across more than one source module so the
    // standalone output would split into sibling chunks; single-file mode must
    // inline them all into one worker.js instead.
    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    await fs.writeFile(path.join(entryDir, 'greeting.ts'), 'export const greeting = () => "hello-single-file";\n');
    const entry = path.join(entryDir, 'worker.entry.ts');
    await fs.writeFile(
      entry,
      ['import { greeting } from "./greeting.ts";', 'process.stdout.write(greeting());', ''].join('\n'),
    );
    mocks.workerEntry = entry;
    mocks.entryDir = entryDir;

    const outputDir = path.join(baseDir, 'dist');
    // No `pack.singleFile` — single-file output is the default.
    await bundle({ baseDir, outputDir });

    const workerPath = path.join(outputDir, 'worker.js');
    const worker = await fs.readFile(workerPath, 'utf8');

    // Single file: no turbopack runtime bootstrap and no sibling-chunk loader call.
    expect(worker).not.toMatch(/_turbopack__runtime/);
    expect(worker).not.toMatch(/R\.c\(/);

    // There must be exactly one main worker chunk (the standalone mode would emit
    // a worker.js loader plus a `worker.<hash>.js` (or `_turbopack__runtime.js`)
    // sibling). Any extra `worker*.js` would indicate chunk splitting.
    const outFiles = await fs.readdir(outputDir);
    const workerChunks = outFiles.filter((f) => /^worker.*\.js$/.test(f));
    expect(workerChunks).toEqual(['worker.js']);
    expect(outFiles).not.toContain('_turbopack__runtime.js');

    // node --check parses the file (valid standalone script).
    await execFileAsync(process.execPath, ['--check', workerPath]);

    // Runtime proof: the inlined module's value is reachable when executed directly.
    const { stdout } = await execFileAsync(process.execPath, [workerPath], { cwd: outputDir });
    expect(stdout).toBe('hello-single-file');
  }, 60_000);
});
