import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bundle, type BuildFunc } from '../src/index.ts';
import { sanitizeBundleOutputRelativePath } from '../src/lib/Bundler.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_BASE = path.join(__dirname, 'fixtures/apps/minimal-app');
const sortStrings = (values: readonly string[]): string[] => [...values].sort((a, b) => a.localeCompare(b));

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

async function writeFixtureManifest(baseDir: string): Promise<string> {
  const manifestDir = path.join(baseDir, '.egg');
  await fs.mkdir(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(FIXTURE_MANIFEST, null, 2));
  return manifestPath;
}

describe('bundle() integration — minimal-app (Phase 1: mocked @utoo/pack)', () => {
  let tmpApp: string;
  let tmpOutput: string;
  let writtenFiles: string[];

  beforeEach(async () => {
    tmpApp = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundle-app-t12-'));
    await fs.cp(FIXTURE_BASE, tmpApp, { recursive: true });
    await writeFixtureManifest(tmpApp);
    tmpOutput = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundle-t12-'));
    writtenFiles = [];
  });

  afterEach(async () => {
    await fs.rm(tmpApp, { recursive: true, force: true });
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
      baseDir: tmpApp,
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
    expect([...result.files]).toEqual(sortStrings(result.files));
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
      baseDir: tmpApp,
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
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
    });

    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    expect(bm.version).toBe(1);
    expect(typeof bm.generatedAt).toBe('string');
    expect(new Date(bm.generatedAt).toString()).not.toBe('Invalid Date');
    expect(bm.mode).toBe('production');
    expect(bm.baseDir).toBe(tmpApp);
    expect(bm.framework).toBe('egg');
    expect(bm.entries).toEqual([{ name: 'worker', source: expect.stringContaining('worker.entry.ts') }]);
    expect(Array.isArray(bm.externals)).toBe(true);
    // externals should be sorted; framework packages are bundled by default.
    expect([...bm.externals]).toEqual(sortStrings(bm.externals));
    expect(bm.externals).not.toContain('egg');
    // chunks should be sorted and contain worker.js
    expect([...bm.chunks]).toEqual(sortStrings(bm.chunks));
    expect(bm.chunks).toContain('worker.js');
    expect(bm.chunks).toContain('tsconfig.json');
    expect(bm.chunks).toContain('package.json');
  });

  it('honors mode: "development" in both the BundleResult and the bundle-manifest', async () => {
    const result = await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      mode: 'development',
      pack: { buildFunc: makeMockBuild() },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    expect(bm.mode).toBe('development');
  });

  it('honors externals.force to inject an extra external into the bundle-manifest externals list', async () => {
    const result = await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
      externals: { force: ['synthetic-force-ext'] },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    expect(bm.externals).toContain('synthetic-force-ext');
  });

  it('patches nested Turbopack import.meta chunks and removes stale sourcemaps', async () => {
    const sourceMapToken = 'sourceMapping' + 'URL';
    const throwingMeta = `var __TURBOPACK__import$2e$meta__ = {
    get url () {
        return (() => { throw new Error("could not convert import.meta.url to filepath"); })();
    }
};
globalThis.__patchedMeta = {
    url: __TURBOPACK__import$2e$meta__.url,
    dirname: __TURBOPACK__import$2e$meta__.dirname,
    filename: __TURBOPACK__import$2e$meta__.filename
};
//# ${sourceMapToken}=chunk #.js.map
`;
    const urlOnlyMeta = `let __TURBOPACK__import$2e$meta__ = { get url () { return "file:///already-patched.js"; } };
globalThis.__patchedMeta = {
    url: __TURBOPACK__import$2e$meta__.url,
    dirname: __TURBOPACK__import$2e$meta__.dirname,
    filename: __TURBOPACK__import$2e$meta__.filename
};
/*# ${sourceMapToken}=url-only.js.map */
`;
    const nonMapTargetMeta = `let __TURBOPACK__import$2e$meta__ = { get url () { return "file:///already-patched.js"; } };
globalThis.__patchedMeta = {
    url: __TURBOPACK__import$2e$meta__.url,
    dirname: __TURBOPACK__import$2e$meta__.dirname,
    filename: __TURBOPACK__import$2e$meta__.filename
};
//# ${sourceMapToken}=not-a-map.txt
`;
    const noSourceMapMeta = `const __TURBOPACK__import$2e$meta__ = { get url () { return "file:///already-patched.js"; } };
globalThis.__patchedMeta = {
    url: __TURBOPACK__import$2e$meta__.url,
    dirname: __TURBOPACK__import$2e$meta__.dirname,
    filename: __TURBOPACK__import$2e$meta__.filename
};
`;

    const buildFunc: BuildFunc = async () => {
      await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// mock worker entry\n');
      await fs.mkdir(path.join(tmpOutput, 'chunks'), { recursive: true });
      await fs.writeFile(path.join(tmpOutput, 'chunks/chunk #.js'), throwingMeta);
      await fs.writeFile(path.join(tmpOutput, 'chunks/chunk #.js.map'), '{"version":3}');
      await fs.writeFile(path.join(tmpOutput, 'chunks/url-only.js'), urlOnlyMeta);
      await fs.writeFile(path.join(tmpOutput, 'chunks/url-only.js.map'), '{"version":3}');
      await fs.writeFile(path.join(tmpOutput, 'chunks/non-map-target.js'), nonMapTargetMeta);
      await fs.writeFile(path.join(tmpOutput, 'chunks/not-a-map.txt'), 'keep me');
      await fs.writeFile(path.join(tmpOutput, 'chunks/no-sourcemap.js'), noSourceMapMeta);
    };

    const result = await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { buildFunc },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8')) as { chunks: string[] };

    async function runPatchedChunk(
      filepath: string,
      options: { argv: string[]; filename?: string; cwd?: string },
    ): Promise<{ url: string; dirname: string; filename: string }> {
      interface SandboxProcess {
        argv: string[];
        cwd: () => string;
      }
      interface Sandbox {
        URL: typeof URL;
        process: SandboxProcess;
        globalThis: Sandbox;
        __dirname?: string;
        __filename?: string;
        __patchedMeta?: { url: string; dirname: string; filename: string };
      }
      const sandbox = {
        URL,
        process: { argv: options.argv, cwd: () => options.cwd ?? tmpOutput },
      } as unknown as Sandbox;
      if (options.filename) {
        sandbox.__filename = options.filename;
        sandbox.__dirname = path.dirname(options.filename);
      }
      sandbox.globalThis = sandbox;
      runInNewContext(await fs.readFile(filepath, 'utf8'), sandbox);
      return sandbox.__patchedMeta!;
    }

    function expectedFileUrl(filename: string): string {
      return pathToFileURL(filename).href;
    }

    const nestedFilename = path.join(tmpOutput, 'chunks/chunk #.js');
    const nestedMeta = await runPatchedChunk(nestedFilename, { argv: ['node', 'worker.js'], filename: nestedFilename });
    expect(nestedMeta).toEqual({
      url: expectedFileUrl(nestedFilename),
      dirname: path.dirname(nestedFilename),
      filename: nestedFilename,
    });

    const urlOnlyFilename = path.join(tmpOutput, 'chunks/url-only.js');
    const urlOnlyPatched = await fs.readFile(urlOnlyFilename, 'utf8');
    expect(urlOnlyPatched).not.toContain('already-patched.js');
    const urlOnlyMetaResult = await runPatchedChunk(urlOnlyFilename, { argv: ['node'], filename: urlOnlyFilename });
    expect(urlOnlyMetaResult).toEqual({
      url: expectedFileUrl(urlOnlyFilename),
      dirname: path.dirname(urlOnlyFilename),
      filename: urlOnlyFilename,
    });

    const noSourceMapFilename = path.join(tmpOutput, 'chunks/no-sourcemap.js');
    const noSourceMapMetaResult = await runPatchedChunk(noSourceMapFilename, {
      argv: ['node'],
      filename: noSourceMapFilename,
    });
    expect(noSourceMapMetaResult).toEqual({
      url: expectedFileUrl(noSourceMapFilename),
      dirname: path.dirname(noSourceMapFilename),
      filename: noSourceMapFilename,
    });

    const fallbackFilename = path.join(tmpOutput, 'worker.js');
    const fallbackMetaResult = await runPatchedChunk(urlOnlyFilename, { argv: ['node', './worker.js'] });
    expect(fallbackMetaResult).toEqual({
      url: expectedFileUrl(fallbackFilename),
      dirname: tmpOutput,
      filename: fallbackFilename,
    });

    const windowsFallbackMetaResult = await runPatchedChunk(urlOnlyFilename, {
      argv: ['node', 'worker.js'],
      cwd: 'C:\\app\\dist',
    });
    expect(windowsFallbackMetaResult).toEqual({
      url: 'file:///C:/app/dist/worker.js',
      dirname: 'C:\\app\\dist',
      filename: 'C:\\app\\dist\\worker.js',
    });

    for (const name of ['chunks/chunk #.js', 'chunks/url-only.js', 'chunks/non-map-target.js']) {
      const content = await fs.readFile(path.join(tmpOutput, name), 'utf8');
      expect(content).not.toContain(sourceMapToken);
    }
    await expect(fs.stat(path.join(tmpOutput, 'chunks/chunk #.js.map'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpOutput, 'chunks/url-only.js.map'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpOutput, 'chunks/not-a-map.txt'))).resolves.toBeTruthy();
    expect(result.files).toEqual(expect.arrayContaining([path.join(tmpOutput, 'chunks/not-a-map.txt')]));
    expect(bm.chunks).toContain('chunks/not-a-map.txt');
    expect(result.files).not.toEqual(expect.arrayContaining([expect.stringContaining('.js.map')]));
    expect(bm.chunks).not.toEqual(expect.arrayContaining([expect.stringContaining('.js.map')]));
  });

  it('patches import.meta chunks without touching a shadowed __dirname binding', async () => {
    const shadowedDirnameMeta = `const __TURBOPACK__import$2e$meta__ = { get url () { return "file:///already-patched.js"; } };
globalThis.__patchedMeta = {
    dirname: __TURBOPACK__import$2e$meta__.dirname
};
const __dirname = "/generated/shadow";
`;

    const buildFunc: BuildFunc = async () => {
      await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// mock worker entry\n');
      await fs.writeFile(path.join(tmpOutput, 'shadowed-dirname.js'), shadowedDirnameMeta);
    };

    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { buildFunc },
    });

    interface Sandbox {
      URL: typeof URL;
      process: { argv: string[]; cwd: () => string };
      globalThis: Sandbox;
      __dirname: string;
      __filename: string;
      __patchedMeta?: { dirname: string };
    }

    const content = await fs.readFile(path.join(tmpOutput, 'shadowed-dirname.js'), 'utf8');
    function runWithFilename(filename: string): { dirname: string } {
      const sandbox = {
        URL,
        process: { argv: ['node', 'worker.js'], cwd: () => tmpOutput },
        __filename: filename,
        __dirname: path.dirname(filename),
      } as Sandbox;
      sandbox.globalThis = sandbox;
      runInNewContext(content, sandbox);
      return sandbox.__patchedMeta!;
    }

    const filename = path.join(tmpOutput, 'shadowed-dirname.js');
    expect(runWithFilename(filename)).toEqual({ dirname: path.dirname(filename) });
    expect(runWithFilename('/worker.js')).toEqual({ dirname: '/' });
    expect(runWithFilename('C:\\worker.js')).toEqual({ dirname: 'C:\\' });
  });

  it('rejects Windows drive-absolute output paths before resolving bundle files', () => {
    expect(() => sanitizeBundleOutputRelativePath('C:/foo.js')).toThrow(/Unsafe bundle output path/);
    expect(() => sanitizeBundleOutputRelativePath('C:\\foo.js')).toThrow(/Unsafe bundle output path/);
    expect(() => sanitizeBundleOutputRelativePath('..\\foo.js')).toThrow(/Unsafe bundle output path/);
  });

  it('wraps a buildFunc failure under the "pack build" step with an identifiable prefix and preserves cause', async () => {
    const original = new Error('synthetic pack failure');
    const buildFunc: BuildFunc = async () => {
      throw original;
    };

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        pack: { buildFunc },
      }),
    ).rejects.toThrowError(/\[@eggjs\/egg-bundler\] pack build failed/);

    try {
      await bundle({
        baseDir: tmpApp,
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
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
    });
    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    const workerSource = bm.entries[0].source as string;
    expect(workerSource).toBe(path.join(tmpApp, '.egg-bundle', 'entries', 'worker.entry.ts'));
    await expect(fs.stat(workerSource)).resolves.toBeTruthy();
    // Spot-check: the generated entry contains the runtime hook calls
    const entrySource = await fs.readFile(workerSource, 'utf8');
    expect(entrySource).toContain('ManifestStore.setBundleStore');
    expect(entrySource).toContain('__EGG_BUNDLE_MODULE_LOADER__');
    expect(entrySource).toContain('startEgg');
  });

  it('copies app runtime assets next to the bundle while preserving baseDir-relative readFile paths', async () => {
    await fs.mkdir(path.join(tmpApp, 'app/port'), { recursive: true });
    await fs.writeFile(path.join(tmpApp, 'app/port/binary.html'), '<html>binary</html>\n');
    await fs.writeFile(path.join(tmpApp, 'app/port/login.html'), '<html>login</html>\n');
    await fs.writeFile(path.join(tmpApp, 'app/port/helper.ts'), 'export const helper = true;\n');
    await fs.mkdir(path.join(tmpApp, 'app/public'), { recursive: true });
    await fs.writeFile(path.join(tmpApp, 'app/public/client.js'), 'globalThis.clientAsset = true;\n');
    await fs.writeFile(path.join(tmpApp, 'app/public/app.ts'), 'export const publicAsset = true;\n');
    await fs.mkdir(path.join(tmpApp, 'app/controller'), { recursive: true });
    await fs.writeFile(path.join(tmpApp, 'app/controller/home.ts'), 'export {};\n');
    await fs.mkdir(path.join(tmpApp, 'app/public/node_modules/ignored'), { recursive: true });
    await fs.writeFile(path.join(tmpApp, 'app/.env'), 'TOKEN=secret\n');
    await fs.writeFile(path.join(tmpApp, 'app/public/.hidden'), 'secret\n');
    await fs.writeFile(path.join(tmpApp, 'app/public/node_modules/ignored/client.js'), 'globalThis.ignored = true;\n');

    const result = await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: { buildFunc: makeMockBuild() },
    });

    await expect(fs.readFile(path.join(tmpOutput, 'app/port/binary.html'), 'utf8')).resolves.toBe(
      '<html>binary</html>\n',
    );
    await expect(fs.readFile(path.join(tmpOutput, 'app/port/login.html'), 'utf8')).resolves.toBe(
      '<html>login</html>\n',
    );
    await expect(fs.readFile(path.join(tmpOutput, 'app/public/client.js'), 'utf8')).resolves.toBe(
      'globalThis.clientAsset = true;\n',
    );
    await expect(fs.readFile(path.join(tmpOutput, 'app/public/app.ts'), 'utf8')).resolves.toBe(
      'export const publicAsset = true;\n',
    );
    await expect(fs.stat(path.join(tmpOutput, 'app/controller/home.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpOutput, 'app/port/helper.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpOutput, 'app/.env'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpOutput, 'app/public/.hidden'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpOutput, 'app/public/node_modules'))).rejects.toMatchObject({ code: 'ENOENT' });

    const bm = JSON.parse(await fs.readFile(result.manifestPath, 'utf8')) as { chunks: string[] };
    expect(bm.chunks).toEqual(
      expect.arrayContaining([
        'app/port/binary.html',
        'app/port/login.html',
        'app/public/app.ts',
        'app/public/client.js',
      ]),
    );
    expect(result.files).toEqual(
      expect.arrayContaining([
        path.join(tmpOutput, 'app/port/binary.html'),
        path.join(tmpOutput, 'app/port/login.html'),
        path.join(tmpOutput, 'app/public/app.ts'),
        path.join(tmpOutput, 'app/public/client.js'),
      ]),
    );

    // Non-bundle mode keeps using the original app baseDir; bundle mode uses
    // outputDir as baseDir, and the copied asset keeps the same relative path.
    await expect(fs.readFile(path.join(tmpApp, 'app/port/binary.html'), 'utf8')).resolves.toBe('<html>binary</html>\n');
    await expect(fs.readFile(path.join(tmpOutput, 'app/port/binary.html'), 'utf8')).resolves.toBe(
      '<html>binary</html>\n',
    );
  });
});

describe('bundle() integration — minimal-app (Phase 2: real @utoo/pack)', () => {
  it.skip('produces real @utoo/pack output — SKIPPED: depends on generate-manifest subprocess fix (see team-lead report). T16 covers this under built-egg.', async () => {
    // Intentionally skipped; see the T12 report for the production bug in
    // tools/egg-bundler/src/scripts/generate-manifest.mjs (raw node cannot
    // parse tegg decorators reachable from egg's src entry).
  });
});

describe('bundle() integration — tegg-app fixture structure', () => {
  const TEGG_FIXTURE_BASE = path.join(__dirname, 'fixtures/apps/tegg-app');

  it('tegg-app fixture exposes the expected @HTTPController + @SingletonProto module layout', async () => {
    // This fixture exercises the tegg plugin path for future T14 coverage of
    // real-@utoo/pack tegg bundling. Pin both the on-disk shape and key tegg
    // decorators so refactors that weaken the fixture are caught early.
    const expected = [
      'config/config.default.ts',
      'config/module.json',
      'config/plugin.ts',
      'modules/foo/FooController.ts',
      'modules/foo/FooService.ts',
      'modules/foo/package.json',
      'package.json',
      'tsconfig.json',
    ];
    for (const rel of expected) {
      await expect(fs.stat(path.join(TEGG_FIXTURE_BASE, rel))).resolves.toBeTruthy();
    }

    const controllerSource = await fs.readFile(path.join(TEGG_FIXTURE_BASE, 'modules/foo/FooController.ts'), 'utf8');
    const serviceSource = await fs.readFile(path.join(TEGG_FIXTURE_BASE, 'modules/foo/FooService.ts'), 'utf8');
    expect(controllerSource).toContain('@HTTPController');
    expect(serviceSource).toContain('@SingletonProto');
  });
});
