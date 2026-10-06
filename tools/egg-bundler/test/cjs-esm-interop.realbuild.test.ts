import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = promisify(execFile);

// REAL @utoo/pack build regression test guarding the EGG-69 CJS/ESM require resolution.
//
// This is intentionally a real build (not a mocked one): the bug was entirely about how
// @utoo/pack (Turbopack, target node) resolves a CJS `require('pkg')` for a dual package.
// Older @utoo/pack resolved it to the package's ESM `module` entry; when that entry exposed
// ONLY a `default` export (json5's dist/index.mjs shape), `require('pkg').parse` was
// undefined — the production `JSON5.parse is not a function` crash. @utoo/pack >= 1.4.16
// fixed this upstream (utooland/utoo#3185): a CJS `require()` of such a dual package now
// resolves to its CommonJS `main`, matching Node's own CommonJS resolution.
//
// A mock cannot catch a @utoo/pack upgrade that regresses that resolution, so this real
// build is the guard. The fixture mirrors json5: a dual package (`main` + `module`, no
// `exports` field) whose ESM entry exports only `default`, required from authored CJS via a
// named member. Node would resolve the require to `main`, so the bundle must print the CJS
// implementation's output, proving the named member is reachable (no crash).

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

describe('CJS require of a dual ESM-only-default dependency — real @utoo/pack build (EGG-69)', () => {
  let baseDir: string;

  beforeEach(async () => {
    // realpath: on macOS os.tmpdir() is a /var -> /private/var symlink and Turbopack's
    // path math rejects the mismatch.
    baseDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-interop-')));
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('resolves require("pkg") to the CommonJS main so the named member is callable in the bundle', async () => {
    await fs.writeFile(path.join(baseDir, 'package.json'), JSON.stringify({ name: 'interop-app' }));

    // Dual package shaped exactly like json5: CJS `main` + ESM `module` whose only export
    // is `default`, no `exports` field. Older @utoo/pack mis-resolved require() to the ESM
    // entry here; the upstream fix resolves it to `main` like Node.
    const pkgDir = path.join(baseDir, 'node_modules', 'esm-default-pkg');
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'esm-default-pkg', main: 'index.js', module: 'index.mjs' }),
    );
    await fs.writeFile(path.join(pkgDir, 'index.js'), 'module.exports = { parse: (s) => `cjs:${s}` };\n');
    await fs.writeFile(path.join(pkgDir, 'index.mjs'), 'export default { parse: (s) => `esm:${s}` };\n');

    // Authored-CJS consumer that requires the dual package and uses a NAMED member.
    const consumerDir = path.join(baseDir, 'node_modules', 'cjs-consumer');
    await fs.mkdir(consumerDir, { recursive: true });
    await fs.writeFile(
      path.join(consumerDir, 'package.json'),
      JSON.stringify({ name: 'cjs-consumer', main: 'index.js' }),
    );
    await fs.writeFile(
      path.join(consumerDir, 'index.js'),
      "const pkg = require('esm-default-pkg');\nmodule.exports = { run: () => pkg.parse('ok') };\n",
    );

    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    const entry = path.join(entryDir, 'worker.entry.ts');
    await fs.writeFile(entry, "import consumer from 'cjs-consumer';\nprocess.stdout.write(consumer.run());\n");
    mocks.workerEntry = entry;
    mocks.entryDir = entryDir;

    const outputDir = path.join(baseDir, 'dist');
    await bundle({ baseDir, outputDir });

    // Runtime proof: the named member is reachable in the bundle (no `parse is not a
    // function` crash). @utoo/pack resolves the CJS require to the package's CommonJS `main`
    // — exactly like Node — so the CJS implementation's output is what runs.
    const { stdout } = await execFileAsync(process.execPath, [path.join(outputDir, 'worker.js')], { cwd: outputDir });
    expect(stdout).toBe('cjs:ok');
  }, 60_000);
});
