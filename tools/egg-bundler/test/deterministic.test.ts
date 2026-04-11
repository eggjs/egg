import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bundle, type BuildFunc } from '../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_SOURCE = path.join(__dirname, 'fixtures/apps/minimal-app');

// T17 verifies that bundling the same app twice produces byte-identical
// artifacts, modulo documented exceptions:
//   - bundle-manifest.json.generatedAt is always `new Date().toISOString()`
//   - bundle-manifest.json.baseDir reflects the caller's baseDir input
//
// Determinism sources exercised:
//   * EntryGenerator sorts fileDiscovery / resolveCache / tegg decoratedFiles
//     by relKey (T9 pins this at the unit level, we re-validate here through
//     the full bundle() orchestration).
//   * Bundler sorts externals and chunks in the bundle-manifest.
//   * Bundler writes bundle-manifest.json with JSON.stringify(_, null, 2) —
//     stable key order because the object is constructed as a literal.
//   * PackRunner pre-writes tsconfig.json and package.json with stable content.
//   * The outputDir absolute path must NOT leak into any artifact (two tmpdirs
//     with different names would cause drift if it did).
//
// Isolation note: T17 clones the fixture into its own per-test tmp dirs rather
// than writing into `fixtures/apps/minimal-app/.egg/`, because T12's
// integration.test.ts also uses that fixture and vitest runs test files in
// parallel threads. Sharing the fixture would produce flaky ENOENT on
// `.egg/manifest.json` when one file's `afterAll` races the other's `beforeAll`.
//
// Real @utoo/pack determinism is a separate concern, deferred to T16/T20.

const FIXTURE_MANIFEST = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  invalidation: {
    lockfileFingerprint: 't17-fixture',
    configFingerprint: 't17-fixture',
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

async function cloneFixture(destParent: string): Promise<string> {
  const dest = path.join(destParent, 'app');
  await fs.cp(FIXTURE_SOURCE, dest, { recursive: true });
  // Remove anything the source dir may have accumulated from concurrent tests.
  await fs.rm(path.join(dest, '.egg'), { recursive: true, force: true });
  await fs.rm(path.join(dest, '.egg-bundle'), { recursive: true, force: true });
  // Pre-write the fixture manifest so ManifestLoader short-circuits the
  // broken `generate-manifest.mjs` subprocess path (documented under T0/T8.1).
  const manifestDir = path.join(dest, '.egg');
  await fs.mkdir(manifestDir, { recursive: true });
  await fs.writeFile(path.join(manifestDir, 'manifest.json'), JSON.stringify(FIXTURE_MANIFEST, null, 2));
  return dest;
}

// The mock build must be deterministic itself — two invocations must write
// identical content. Otherwise we'd be measuring pack variance, not bundler
// variance. Every byte is hard-coded.
function makeDeterministicMockBuild(outputDir: string): BuildFunc {
  return async () => {
    const artifacts: Array<[string, string]> = [
      ['worker.js', '// deterministic worker chunk\nmodule.exports = { marker: "worker" };\n'],
      ['worker.js.map', '{"version":3,"sources":[],"mappings":""}'],
      ['_turbopack__runtime.js', '// deterministic runtime shim\n'],
      ['_turbopack__runtime.js.map', '{}'],
      ['_root-of-the-server___abc123.js', '// deterministic root chunk\n'],
      ['_root-of-the-server___abc123.js.map', '{}'],
    ];
    for (const [name, body] of artifacts) {
      await fs.writeFile(path.join(outputDir, name), body);
    }
  };
}

async function sha256(filepath: string): Promise<string> {
  return createHash('sha256')
    .update(await fs.readFile(filepath))
    .digest('hex');
}

async function hashByBasename(files: readonly string[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const f of files) {
    hashes[path.basename(f)] = await sha256(f);
  }
  return hashes;
}

describe('bundle() is deterministic (T17)', () => {
  const tmpDirs: string[] = [];

  beforeEach(() => {
    tmpDirs.length = 0;
  });

  afterEach(async () => {
    for (const dir of tmpDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  async function mkTmp(suffix: string): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `egg-bundler-det-${suffix}-`));
    const real = await fs.realpath(dir);
    tmpDirs.push(real);
    return real;
  }

  async function makeWorkspace(suffix: string): Promise<{ baseDir: string; outputDir: string }> {
    const workspace = await mkTmp(suffix);
    const baseDir = await cloneFixture(workspace);
    const outputDir = path.join(workspace, 'out');
    await fs.mkdir(outputDir, { recursive: true });
    return { baseDir, outputDir };
  }

  it('same baseDir, two outputDirs → every produced artifact is byte-identical except bundle-manifest.generatedAt', async () => {
    // Single baseDir, two output dirs. This is the primary "idempotent given
    // same input" contract. worker.entry.ts is written to
    // <baseDir>/.egg-bundle/entries/ — two runs will overwrite it with the same
    // bytes (we also read it out directly to double-check).
    const { baseDir, outputDir: outA } = await makeWorkspace('same-a');
    const outB = path.join(path.dirname(outA), 'out-b');
    await fs.mkdir(outB, { recursive: true });

    const resultA = await bundle({
      baseDir,
      outputDir: outA,
      pack: { buildFunc: makeDeterministicMockBuild(outA) },
    });
    const resultB = await bundle({
      baseDir,
      outputDir: outB,
      pack: { buildFunc: makeDeterministicMockBuild(outB) },
    });

    // File sets must match by basename.
    const basenamesA = resultA.files.map((f) => path.basename(f)).sort();
    const basenamesB = resultB.files.map((f) => path.basename(f)).sort();
    expect(basenamesA).toEqual(basenamesB);

    const hashesA = await hashByBasename(resultA.files);
    const hashesB = await hashByBasename(resultB.files);

    const drift: string[] = [];
    for (const name of Object.keys(hashesA)) {
      if (name === 'bundle-manifest.json') continue;
      if (hashesA[name] !== hashesB[name]) drift.push(name);
    }
    // Drift diagnostic: if this fails, typical culprits (descending likelihood):
    //   - Map iteration order (Object.keys in EntryGenerator not sorted)
    //   - Date.now / new Date() snuck into an artifact besides bundle-manifest
    //   - outputDir absolute path leaked into a chunk (also caught by test 3)
    //   - tmpdir pollution (previous run's artifacts not cleaned)
    //   - New dependency accidentally introducing randomness
    expect(drift, `non-deterministic files: ${drift.join(', ')}`).toEqual([]);

    // Bundle-manifest: filter out the known-variable field, deepEqual the rest.
    type LooseManifest = Record<string, unknown>;
    const bmA = JSON.parse(await fs.readFile(resultA.manifestPath, 'utf8')) as LooseManifest;
    const bmB = JSON.parse(await fs.readFile(resultB.manifestPath, 'utf8')) as LooseManifest;
    expect(typeof bmA.generatedAt).toBe('string');
    expect(new Date(bmA.generatedAt as string).toString()).not.toBe('Invalid Date');
    delete bmA.generatedAt;
    delete bmB.generatedAt;
    expect(bmA).toEqual(bmB);
  });

  it('different baseDir clones produce byte-identical worker.entry.ts (relative specifier guarantee)', async () => {
    // Two independent workspace clones, bundled to each own output. Because
    // EntryGenerator emits relative specifiers (`../../app/...`) keyed on
    // manifest relKeys, the two entry files must be byte-identical even
    // though the absolute baseDirs differ entirely.
    const { baseDir: baseDirA, outputDir: outA } = await makeWorkspace('diff-a');
    const { baseDir: baseDirB, outputDir: outB } = await makeWorkspace('diff-b');
    expect(baseDirA).not.toBe(baseDirB);

    await bundle({
      baseDir: baseDirA,
      outputDir: outA,
      pack: { buildFunc: makeDeterministicMockBuild(outA) },
    });
    await bundle({
      baseDir: baseDirB,
      outputDir: outB,
      pack: { buildFunc: makeDeterministicMockBuild(outB) },
    });

    const entryA = await fs.readFile(path.join(baseDirA, '.egg-bundle', 'entries', 'worker.entry.ts'), 'utf8');
    const entryB = await fs.readFile(path.join(baseDirB, '.egg-bundle', 'entries', 'worker.entry.ts'), 'utf8');
    expect(entryA).toBe(entryB);
    // Sanity: the entry must actually NOT contain either absolute baseDir,
    // otherwise byte-equality would be accidental.
    expect(entryA).not.toContain(baseDirA);
    expect(entryA).not.toContain(baseDirB);

    // Same for worker.js / tsconfig.json / package.json — everything in outA
    // should be byte-identical to its outB counterpart.
    const drift: string[] = [];
    const namesInA = (await fs.readdir(outA)).sort();
    const namesInB = (await fs.readdir(outB)).sort();
    expect(namesInA).toEqual(namesInB);
    for (const name of namesInA) {
      if (name === 'bundle-manifest.json') continue; // carries baseDir + generatedAt
      const hashA = await sha256(path.join(outA, name));
      const hashB = await sha256(path.join(outB, name));
      if (hashA !== hashB) drift.push(name);
    }
    expect(drift, `non-deterministic files across clones: ${drift.join(', ')}`).toEqual([]);
  });

  it('no artifact leaks the outputDir absolute path (tmpdir difference is invisible to consumers)', async () => {
    const { baseDir, outputDir: outA } = await makeWorkspace('leak-a');
    const outB = path.join(path.dirname(outA), 'out-b');
    await fs.mkdir(outB, { recursive: true });

    const resultA = await bundle({
      baseDir,
      outputDir: outA,
      pack: { buildFunc: makeDeterministicMockBuild(outA) },
    });
    const resultB = await bundle({
      baseDir,
      outputDir: outB,
      pack: { buildFunc: makeDeterministicMockBuild(outB) },
    });

    // bundle-manifest.json intentionally carries `baseDir` but NOT `outputDir`,
    // so no emitted file should reference either tmp output path. The
    // worker.entry.ts (under baseDir/.egg-bundle/entries/) uses relative
    // imports — it never touches the outputDir.
    const allFiles = [...resultA.files, ...resultB.files];
    for (const file of allFiles) {
      const content = await fs.readFile(file, 'utf8');
      expect(content, `${path.basename(file)} leaks outA`).not.toContain(outA);
      expect(content, `${path.basename(file)} leaks outB`).not.toContain(outB);
    }
  });
});
