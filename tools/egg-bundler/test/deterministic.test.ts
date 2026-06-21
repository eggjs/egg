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
//   - worker.entry.ts embeds concrete original app absolute aliases so runtime
//     lookups can serve original absolute paths; comparisons normalize those
//     aliases by baseDir
//
// Determinism sources exercised:
//   * EntryGenerator sorts fileDiscovery / resolveCache / tegg decoratedFiles
//     by relKey (T9 pins this at the unit level, we re-validate here through
//     the full bundle() orchestration).
//   * Bundler sorts externals and chunks in the bundle-manifest.
//   * Bundler writes bundle-manifest.json with JSON.stringify(_, null, 2) —
//     stable key order because the object is constructed as a literal.
//   * PackRunner pre-writes package.json (output dir) and the compiler
//     tsconfig.json (project/entry dir) with stable content.
//   * The outputDir absolute path must NOT leak into any artifact (two tmpdirs
//     with different names would cause drift if it did).
//
// Isolation note: T17 clones only source fixture files into per-test tmp dirs,
// then owns the generated `.egg/` and `.egg-bundle/` state inside each clone.
// Determinism should not depend on stale generated metadata from prior runs or
// shared fixture output.
//
// Real @utoo/pack determinism is a separate concern, deferred to T16/T20.
// The mock build still copies the generated worker entry into worker.js so
// produced artifact checks cover the runtime alias strings emitted by
// EntryGenerator.

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
  // Skip generated metadata dirs during copy; this test creates the exact
  // generated state it needs inside the cloned fixture.
  await fs.cp(FIXTURE_SOURCE, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(FIXTURE_SOURCE, src);
      if (!rel) return true;
      const firstSegment = rel.split(path.sep)[0];
      return firstSegment !== '.egg-bundle' && firstSegment !== '.egg';
    },
  });
  // Pre-write the fixture manifest so ManifestLoader short-circuits the
  // broken `generate-manifest.mjs` subprocess path (documented under T0/T8.1).
  const manifestDir = path.join(dest, '.egg');
  await fs.mkdir(manifestDir, { recursive: true });
  await fs.writeFile(path.join(manifestDir, 'manifest.json'), JSON.stringify(FIXTURE_MANIFEST, null, 2));
  return dest;
}

interface MockPackConfig {
  entry?: Array<{ name: string; import: string }>;
}

// The mock build must be deterministic itself. It copies the generated worker
// entry into worker.js to exercise shipped-runtime content, while all support
// chunks stay hard-coded so we measure bundler variance rather than pack
// variance.
function makeDeterministicMockBuild(outputDir: string): BuildFunc {
  return async ({ config }) => {
    const packConfig = config as MockPackConfig;
    const workerEntry = packConfig.entry?.find((entry) => entry.name === 'worker')?.import;
    if (!workerEntry) throw new Error('worker entry is missing from mock pack config');
    const workerSource = await fs.readFile(workerEntry, 'utf8');
    const artifacts: Array<[string, string]> = [
      ['worker.js', workerSource],
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

function sha256Content(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function outputRel(outputDir: string, filepath: string): string {
  return path.relative(outputDir, filepath);
}

function normalizeWorkerAppBaseDir(source: string, baseDir: string): string {
  const posixBaseDir = baseDir.split(path.sep).join('/');
  return Array.from(new Set([baseDir, posixBaseDir])).reduce(
    (result, current) => result.split(current).join('<baseDir>'),
    source,
  );
}

function hasEmbeddedBaseDir(source: string, baseDir: string): boolean {
  const posixBaseDir = baseDir.split(path.sep).join('/');
  return source.includes(baseDir) || source.includes(posixBaseDir);
}

async function hashByOutputRel(
  files: readonly string[],
  outputDir: string,
  options: { normalizeAppBaseDir?: string } = {},
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const f of files) {
    const rel = outputRel(outputDir, f);
    if (rel === 'worker.js' && options.normalizeAppBaseDir) {
      hashes[rel] = sha256Content(normalizeWorkerAppBaseDir(await fs.readFile(f, 'utf8'), options.normalizeAppBaseDir));
    } else {
      hashes[rel] = await sha256(f);
    }
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

    // File sets must match by output-relative path.
    const pathsA = resultA.files.map((f) => outputRel(outA, f)).sort();
    const pathsB = resultB.files.map((f) => outputRel(outB, f)).sort();
    expect(pathsA).toEqual(pathsB);

    const hashesA = await hashByOutputRel(resultA.files, outA);
    const hashesB = await hashByOutputRel(resultB.files, outB);

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
    expect(typeof bmB.generatedAt).toBe('string');
    expect(new Date(bmB.generatedAt as string).toString()).not.toBe('Invalid Date');
    delete bmA.generatedAt;
    delete bmB.generatedAt;
    expect(bmA).toEqual(bmB);
  });

  it('different baseDir clones produce the same worker runtime except for original app absolute aliases', async () => {
    // Two independent workspace clones, bundled to each own output. Because
    // EntryGenerator emits relative specifiers (`../../app/...`) keyed on
    // manifest relKeys, the module graph stays identical. The original app
    // absolute aliases intentionally differ so bundled importModule() can still
    // serve original absolute-path lookups.
    const { baseDir: baseDirA, outputDir: outA } = await makeWorkspace('diff-a');
    const { baseDir: baseDirB, outputDir: outB } = await makeWorkspace('diff-b');
    expect(baseDirA).not.toBe(baseDirB);

    const resultA = await bundle({
      baseDir: baseDirA,
      outputDir: outA,
      pack: { buildFunc: makeDeterministicMockBuild(outA) },
    });
    const resultB = await bundle({
      baseDir: baseDirB,
      outputDir: outB,
      pack: { buildFunc: makeDeterministicMockBuild(outB) },
    });

    const entryA = await fs.readFile(path.join(baseDirA, '.egg-bundle', 'entries', 'worker.entry.ts'), 'utf8');
    const entryB = await fs.readFile(path.join(baseDirB, '.egg-bundle', 'entries', 'worker.entry.ts'), 'utf8');
    expect(normalizeWorkerAppBaseDir(entryA, baseDirA)).toBe(normalizeWorkerAppBaseDir(entryB, baseDirB));
    // Sanity: only the owning app absolute aliases are embedded.
    expect(hasEmbeddedBaseDir(entryA, baseDirA)).toBe(true);
    expect(hasEmbeddedBaseDir(entryA, baseDirB)).toBe(false);
    expect(hasEmbeddedBaseDir(entryB, baseDirB)).toBe(true);
    expect(hasEmbeddedBaseDir(entryB, baseDirA)).toBe(false);
    const workerA = await fs.readFile(path.join(outA, 'worker.js'), 'utf8');
    const workerB = await fs.readFile(path.join(outB, 'worker.js'), 'utf8');
    expect(normalizeWorkerAppBaseDir(workerA, baseDirA)).toBe(normalizeWorkerAppBaseDir(workerB, baseDirB));
    expect(hasEmbeddedBaseDir(workerA, baseDirA)).toBe(true);
    expect(hasEmbeddedBaseDir(workerB, baseDirB)).toBe(true);

    // Same for every produced artifact — everything in outA should be
    // identical to its outB counterpart after normalizing the documented
    // original-app absolute aliases in the packed worker runtime.
    const drift: string[] = [];
    const hashesA = await hashByOutputRel(resultA.files, outA, { normalizeAppBaseDir: baseDirA });
    const hashesB = await hashByOutputRel(resultB.files, outB, { normalizeAppBaseDir: baseDirB });
    const namesInA = Object.keys(hashesA).sort();
    const namesInB = Object.keys(hashesB).sort();
    expect(namesInA).toEqual(namesInB);
    for (const name of namesInA) {
      if (name === 'bundle-manifest.json') continue; // carries baseDir + generatedAt
      const hashA = hashesA[name];
      const hashB = hashesB[name];
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
