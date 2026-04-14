import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bundle, type BuildFunc } from '../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_BASE = path.join(__dirname, 'fixtures/apps/minimal-app');

// The minimal-app fixture has no checked-in manifest. `bundle()` would try
// to fork `generate-manifest.mjs`, which fails under raw node because
// `packages/egg`'s `exports['.']` points at `./src/index.ts` and Node's
// type-stripper can't parse tegg decorators reachable from that entry. The
// subprocess failure is tracked separately; for T12 we pre-write a minimal
// valid manifest and let `ManifestLoader.#readFromDisk` short-circuit.
const FIXTURE_MANIFEST = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  invalidation: {
    lockfileFingerprint: 't12-fixture',
    configFingerprint: 't12-fixture',
    serverEnv: 'prod',
    serverScope: '',
    typescriptEnabled: true,
  },
  extensions: {},
  resolveCache: {},
  fileDiscovery: {
    'app/controller': ['home.ts'],
    'app/service': ['user.ts'],
    'app/middleware': ['timing.ts'],
    'app/extend': ['context.ts'],
    app: ['router.ts'],
  },
};

async function writeFixtureManifest(): Promise<string> {
  const manifestDir = path.join(FIXTURE_BASE, '.egg');
  await fs.mkdir(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(FIXTURE_MANIFEST, null, 2));
  return manifestPath;
}

async function removeFixtureManifest(): Promise<void> {
  await fs.rm(path.join(FIXTURE_BASE, '.egg'), { recursive: true, force: true });
}

describe('bundle() integration — minimal-app (Phase 1: mocked @utoo/pack)', () => {
  let tmpOutput: string;
  let writtenFiles: string[];

  beforeAll(async () => {
    await writeFixtureManifest();
  });

  afterAll(async () => {
    await removeFixtureManifest();
  });

  beforeEach(async () => {
    tmpOutput = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundle-t12-'));
    writtenFiles = [];
  });

  afterEach(async () => {
    await fs.rm(tmpOutput, { recursive: true, force: true });
  });

  // Mock build that mimics what @utoo/pack would produce, so the rest of the
  // Bundler pipeline (file enumeration, bundle-manifest write-back) sees a
  // realistic output shape.
  function makeMockBuild(): BuildFunc {
    return async (_wrapped, _project, _root) => {
      const artifacts = [
        ['worker.js', '// fake worker chunk\nmodule.exports = {};\n'],
        ['worker.js.map', '{"version":3,"sources":[],"mappings":""}'],
        ['_turbopack__runtime.js', '// fake runtime shim\n'],
        ['_turbopack__runtime.js.map', '{}'],
        ['_root-of-the-server___abc123.js', '// fake root chunk\n'],
        ['_root-of-the-server___abc123.js.map', '{}'],
      ];
      for (const [name, body] of artifacts) {
        const filePath = path.join(tmpOutput, name);
        await fs.writeFile(filePath, body);
        writtenFiles.push(name);
      }
    };
  }

  it('returns a BundleResult whose outputDir / files / manifestPath match the output directory', async () => {
    const result = await bundle({
      baseDir: FIXTURE_BASE,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
    });

    expect(result.outputDir).toBe(tmpOutput);
    expect(result.manifestPath).toBe(path.join(tmpOutput, 'bundle-manifest.json'));
    // files must include all mock chunks + PackRunner pre-writes + bundle-manifest
    expect(result.files).toEqual(
      expect.arrayContaining([
        path.join(tmpOutput, 'worker.js'),
        path.join(tmpOutput, 'worker.js.map'),
        path.join(tmpOutput, '_turbopack__runtime.js'),
        path.join(tmpOutput, '_root-of-the-server___abc123.js'),
        path.join(tmpOutput, 'tsconfig.json'),
        path.join(tmpOutput, 'package.json'),
        path.join(tmpOutput, 'bundle-manifest.json'),
      ]),
    );
    // files should be sorted
    expect([...result.files]).toEqual([...result.files].sort());
  });

  it('PackRunner pre-writes tsconfig.json (with decorator flags) and package.json (type: commonjs) BEFORE the build step runs', async () => {
    let tsconfigAtBuildTime: string | undefined;
    let pkgAtBuildTime: string | undefined;
    const buildFunc: BuildFunc = async () => {
      tsconfigAtBuildTime = await fs.readFile(path.join(tmpOutput, 'tsconfig.json'), 'utf8');
      pkgAtBuildTime = await fs.readFile(path.join(tmpOutput, 'package.json'), 'utf8');
      await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// mock\n');
    };

    await bundle({
      baseDir: FIXTURE_BASE,
      outputDir: tmpOutput,
      pack: { buildFunc },
    });

    expect(tsconfigAtBuildTime).toBeDefined();
    const tsconfig = JSON.parse(tsconfigAtBuildTime!);
    expect(tsconfig.compilerOptions.experimentalDecorators).toBe(true);
    expect(tsconfig.compilerOptions.emitDecoratorMetadata).toBe(true);
    expect(tsconfig.compilerOptions.target).toBe('es2022');

    expect(pkgAtBuildTime).toBeDefined();
    expect(JSON.parse(pkgAtBuildTime!)).toEqual({ type: 'commonjs' });
  });

  it('writes a bundle-manifest.json whose schema matches docs/output-structure.md', async () => {
    const result = await bundle({
      baseDir: FIXTURE_BASE,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
    });

    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    expect(bm.version).toBe(1);
    expect(typeof bm.generatedAt).toBe('string');
    expect(new Date(bm.generatedAt).toString()).not.toBe('Invalid Date');
    expect(bm.mode).toBe('production');
    expect(bm.baseDir).toBe(FIXTURE_BASE);
    expect(bm.framework).toBe('egg');
    expect(bm.entries).toEqual([{ name: 'worker', source: expect.stringContaining('worker.entry.ts') }]);
    expect(Array.isArray(bm.externals)).toBe(true);
    // externals should be sorted and should contain at least egg (workspace dep)
    expect([...bm.externals]).toEqual([...bm.externals].sort());
    expect(bm.externals).toContain('egg');
    // chunks should be sorted and contain worker.js
    expect([...bm.chunks]).toEqual([...bm.chunks].sort());
    expect(bm.chunks).toContain('worker.js');
    expect(bm.chunks).toContain('tsconfig.json');
    expect(bm.chunks).toContain('package.json');
  });

  it('honors mode: "development" in both the BundleResult and the bundle-manifest', async () => {
    const result = await bundle({
      baseDir: FIXTURE_BASE,
      outputDir: tmpOutput,
      mode: 'development',
      pack: { buildFunc: makeMockBuild() },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    expect(bm.mode).toBe('development');
  });

  it('honors externals.force to inject an extra external into the bundle-manifest externals list', async () => {
    const result = await bundle({
      baseDir: FIXTURE_BASE,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
      externals: { force: ['synthetic-force-ext'] },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    expect(bm.externals).toContain('synthetic-force-ext');
  });

  it('wraps a buildFunc failure under the "pack build" step with an identifiable prefix and preserves cause', async () => {
    const original = new Error('synthetic pack failure');
    const buildFunc: BuildFunc = async () => {
      throw original;
    };

    await expect(
      bundle({
        baseDir: FIXTURE_BASE,
        outputDir: tmpOutput,
        pack: { buildFunc },
      }),
    ).rejects.toThrowError(/\[@eggjs\/egg-bundler\] pack build failed/);

    try {
      await bundle({
        baseDir: FIXTURE_BASE,
        outputDir: tmpOutput,
        pack: { buildFunc },
      });
    } catch (err) {
      // Bundler wraps with its own message; PackRunner wraps once inside.
      // Walk the cause chain to find the synthetic root.
      let cause: unknown = (err as Error).cause;
      while (cause && (cause as Error).cause) cause = (cause as Error).cause;
      expect(cause).toBe(original);
    }
  });

  it('the worker.entry.ts generated by EntryGenerator lives under <baseDir>/.egg-bundle/entries/ and is referenced by bundle-manifest.entries[].source', async () => {
    const result = await bundle({
      baseDir: FIXTURE_BASE,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    const workerSource = bm.entries[0].source as string;
    expect(workerSource).toBe(path.join(FIXTURE_BASE, '.egg-bundle', 'entries', 'worker.entry.ts'));
    await expect(fs.stat(workerSource)).resolves.toBeTruthy();
    // Spot-check: the generated entry contains the runtime hook calls
    const entrySource = await fs.readFile(workerSource, 'utf8');
    expect(entrySource).toContain('ManifestStore.setBundleStore');
    expect(entrySource).toContain('setBundleModuleLoader');
    expect(entrySource).toContain('startEgg');
  });
});

describe('bundle() integration — minimal-app (Phase 2: real @utoo/pack)', () => {
  it.skip('produces real @utoo/pack output — SKIPPED: depends on generate-manifest subprocess fix (see team-lead report). T16 covers this under built-egg.', async () => {
    // Intentionally skipped; see the T12 report for the production bug in
    // tools/egg-bundler/src/scripts/generate-manifest.mjs (raw node cannot
    // parse tegg decorators reachable from egg's src entry).
  });
});
