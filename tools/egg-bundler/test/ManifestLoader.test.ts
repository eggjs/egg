import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { StartupManifest } from '@eggjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { ManifestLoader } from '../src/lib/ManifestLoader.ts';

const tempDirs: string[] = [];

function createTempApp(): string {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-bundler-manifest-loader-'));
  tempDirs.push(baseDir);
  return baseDir;
}

function writeJson(filepath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function manifest(overrides: Partial<StartupManifest> = {}): StartupManifest {
  return {
    version: 1,
    generatedAt: '2026-04-30T00:00:00.000Z',
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
    ...overrides,
  };
}

function generatedManifest(): StartupManifest {
  return manifest({
    generatedAt: '2026-04-30T00:00:00.000Z',
    invalidation: {
      lockfileFingerprint: '',
      configFingerprint: '',
      serverEnv: 'prod',
      serverScope: '',
      typescriptEnabled: false,
    },
    extensions: {
      generated: true,
    },
    resolveCache: {
      'app/service/user': 'app/service/user.ts',
    },
    fileDiscovery: {
      'app/service': ['user.ts'],
    },
  });
}

async function createFrameworkFixture(
  exportsField: unknown = {
    import: './src/index.js',
  },
): Promise<{ appDir: string; frameworkDir: string }> {
  const root = createTempApp();
  const appDir = path.join(root, 'app');
  const frameworkDir = path.join(root, 'framework');
  await fsp.mkdir(path.join(frameworkDir, 'src'), { recursive: true });
  await fsp.mkdir(appDir, { recursive: true });

  await fsp.writeFile(path.join(appDir, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }));
  await fsp.writeFile(
    path.join(frameworkDir, 'package.json'),
    JSON.stringify(
      {
        name: 'fake-framework',
        type: 'module',
        exports: exportsField,
        dependencies: {},
      },
      null,
      2,
    ),
  );
  await fsp.writeFile(
    path.join(frameworkDir, 'src/index.js'),
    `
import fs from 'node:fs/promises';
import path from 'node:path';

export async function start(options) {
  await fs.writeFile(path.join(options.baseDir, 'framework-entry.txt'), import.meta.url);
  await fs.writeFile(path.join(options.baseDir, 'exec-argv.json'), JSON.stringify(process.execArgv));
  return {
    loader: {
      generateManifest() {
        return ${JSON.stringify(generatedManifest(), null, 10)};
      },
    },
    async close() {
      await fs.writeFile(path.join(options.baseDir, 'closed.txt'), 'true');
    },
  };
}
`,
  );

  return { appDir, frameworkDir };
}

async function loadFrameworkFixture(exportsField: unknown): Promise<{ appDir: string; frameworkDir: string }> {
  const fixture = await createFrameworkFixture(exportsField);
  const loader = new ManifestLoader({
    baseDir: fixture.appDir,
    framework: fixture.frameworkDir,
    autoGenerate: true,
    env: 'prod',
    execArgv: [],
  });
  await loader.load();
  return fixture;
}

async function createInstalledFrameworkFixture(
  exportsField: unknown = {
    '.': {
      import: './src/index.js',
    },
  },
): Promise<{ appDir: string; frameworkDir: string }> {
  const root = createTempApp();
  const appDir = path.join(root, 'app');
  const frameworkDir = path.join(appDir, 'node_modules/fake-framework');
  await fsp.mkdir(path.join(frameworkDir, 'src'), { recursive: true });

  await fsp.writeFile(
    path.join(appDir, 'package.json'),
    JSON.stringify({ name: 'app', dependencies: { 'fake-framework': '1.0.0' } }),
  );
  await fsp.writeFile(
    path.join(frameworkDir, 'package.json'),
    JSON.stringify(
      {
        name: 'fake-framework',
        type: 'module',
        exports: exportsField,
        dependencies: {},
      },
      null,
      2,
    ),
  );
  await fsp.writeFile(
    path.join(frameworkDir, 'src/index.js'),
    `
import fs from 'node:fs/promises';
import path from 'node:path';

export async function start(options) {
  await fs.writeFile(path.join(options.baseDir, 'framework-entry.txt'), import.meta.url);
  return {
    loader: {
      generateManifest() {
        return ${JSON.stringify(generatedManifest(), null, 10)};
      },
    },
    async close() {},
  };
}
`,
  );

  return { appDir, frameworkDir };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ManifestLoader', () => {
  it('normalizes absolute manifest paths through nested dependency package roots', async () => {
    const baseDir = createTempApp();
    const directRoot = path.join(baseDir, 'node_modules/direct');
    const transitiveRoot = path.join(directRoot, 'node_modules/transitive');
    const transitiveLib = path.join(transitiveRoot, 'lib');
    const transitiveFile = path.join(transitiveLib, 'svc.ts');
    const hoistedRoot = path.join(baseDir, 'node_modules/hoisted-transitive');
    const hoistedFile = path.join(hoistedRoot, 'index.ts');
    const optionalRoot = path.join(baseDir, 'node_modules/optional-native');
    const optionalFile = path.join(optionalRoot, 'index.ts');

    writeJson(path.join(baseDir, 'package.json'), {
      dependencies: {
        direct: '1.0.0',
      },
      optionalDependencies: {
        'optional-native': '1.0.0',
      },
    });
    writeJson(path.join(directRoot, 'package.json'), {
      name: 'direct',
      version: '1.0.0',
      dependencies: {
        transitive: '1.0.0',
        'hoisted-transitive': '1.0.0',
      },
    });
    writeJson(path.join(transitiveRoot, 'package.json'), {
      name: 'transitive',
      version: '1.0.0',
    });
    writeJson(path.join(hoistedRoot, 'package.json'), {
      name: 'hoisted-transitive',
      version: '1.0.0',
    });
    writeJson(path.join(optionalRoot, 'package.json'), {
      name: 'optional-native',
      version: '1.0.0',
    });
    fs.mkdirSync(transitiveLib, { recursive: true });
    fs.writeFileSync(transitiveFile, 'export const value = 1;\n');
    fs.writeFileSync(hoistedFile, 'export const hoisted = true;\n');
    fs.writeFileSync(optionalFile, 'export const optional = true;\n');

    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    writeJson(
      manifestPath,
      manifest({
        fileDiscovery: {
          [transitiveLib]: ['svc.ts'],
        },
        resolveCache: {
          [path.join(transitiveRoot, 'entry')]: transitiveFile,
          [path.join(hoistedRoot, 'entry')]: hoistedFile,
          [path.join(optionalRoot, 'entry')]: optionalFile,
        },
        extensions: {
          tegg: {
            moduleDescriptors: [
              {
                unitPath: transitiveRoot,
                decoratedFiles: ['lib/svc.ts'],
              },
            ],
          },
        },
      }),
    );

    const loader = new ManifestLoader({ baseDir, manifestPath, autoGenerate: false });
    const loaded = await loader.load();

    expect(loaded.fileDiscovery).toEqual({
      'node_modules/direct/node_modules/transitive/lib': ['svc.ts'],
    });
    expect(loaded.resolveCache).toEqual({
      'node_modules/hoisted-transitive/entry': 'node_modules/hoisted-transitive/index.ts',
      'node_modules/direct/node_modules/transitive/entry': 'node_modules/direct/node_modules/transitive/lib/svc.ts',
      'node_modules/optional-native/entry': 'node_modules/optional-native/index.ts',
    });
    expect(loaded.extensions.tegg).toEqual({
      moduleDescriptors: [
        {
          unitPath: 'node_modules/direct/node_modules/transitive',
          decoratedFiles: ['lib/svc.ts'],
        },
      ],
    });
    expect(loader.getAllDiscoveredFiles()).toEqual([transitiveFile]);
    expect(loader.getTeggDecoratedFiles()).toEqual([transitiveFile]);
    expect(loader.store.data).toBe(loaded);
  });

  it('merges file discovery entries that normalize to the same package path', async () => {
    const baseDir = createTempApp();
    const directLib = path.join(baseDir, 'node_modules/direct/lib');
    fs.mkdirSync(directLib, { recursive: true });
    writeJson(path.join(baseDir, 'package.json'), {
      dependencies: {
        direct: '1.0.0',
      },
    });
    writeJson(path.join(baseDir, 'node_modules/direct/package.json'), {
      name: 'direct',
      version: '1.0.0',
    });

    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    writeJson(
      manifestPath,
      manifest({
        fileDiscovery: {
          [directLib]: ['a.ts'],
          'node_modules/direct/lib': ['a.ts', 'b.ts'],
        },
      }),
    );

    const loaded = await new ManifestLoader({ baseDir, manifestPath, autoGenerate: false }).load();

    expect(loaded.fileDiscovery).toEqual({
      'node_modules/direct/lib': ['a.ts', 'b.ts'],
    });
  });

  it('rejects conflicting resolve cache entries that normalize to the same key', async () => {
    const baseDir = createTempApp();
    const directRoot = path.join(baseDir, 'node_modules/direct');
    fs.mkdirSync(directRoot, { recursive: true });
    writeJson(path.join(baseDir, 'package.json'), {
      dependencies: {
        direct: '1.0.0',
      },
    });
    writeJson(path.join(directRoot, 'package.json'), {
      name: 'direct',
      version: '1.0.0',
    });

    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    writeJson(
      manifestPath,
      manifest({
        resolveCache: {
          [path.join(directRoot, 'entry')]: path.join(directRoot, 'a.ts'),
          'node_modules/direct/entry': 'node_modules/direct/b.ts',
        },
      }),
    );

    await expect(new ManifestLoader({ baseDir, manifestPath, autoGenerate: false }).load()).rejects.toThrow(
      'conflicting normalized resolveCache entry for node_modules/direct/entry',
    );
  });

  it('loads older minimal manifests without extensions', async () => {
    const baseDir = createTempApp();
    writeJson(path.join(baseDir, 'package.json'), {});
    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    writeJson(manifestPath, {
      ...manifest(),
      extensions: undefined,
    });

    const loaded = await new ManifestLoader({ baseDir, manifestPath, autoGenerate: false }).load();

    expect(loaded.extensions).toEqual({});
  });

  it('does not auto-generate missing manifests by default', async () => {
    const baseDir = createTempApp();
    writeJson(path.join(baseDir, 'package.json'), {});
    const manifestPath = path.join(baseDir, '.egg/manifest.json');

    const loader = new ManifestLoader({ baseDir, manifestPath });

    await expect(loader.load()).rejects.toThrow(`manifest not found at ${manifestPath}`);
  });

  it('auto-generates a missing manifest and loads the exact generated data', async () => {
    const { appDir, frameworkDir } = await createFrameworkFixture();
    const manifestPath = path.join(appDir, '.egg/manifest.json');
    const expected = generatedManifest();

    const loader = new ManifestLoader({
      baseDir: appDir,
      framework: frameworkDir,
      autoGenerate: true,
      env: 'prod',
      execArgv: [],
    });
    const loaded = await loader.load();
    const written = JSON.parse(await fsp.readFile(manifestPath, 'utf-8'));

    expect(written).toEqual(expected);
    expect(loaded).toEqual(expected);
    expect(loader.store.data).toBe(loaded);
    await expect(fsp.readFile(path.join(appDir, 'closed.txt'), 'utf-8')).resolves.toBe('true');
    await expect(fsp.readFile(path.join(appDir, 'framework-entry.txt'), 'utf-8')).resolves.toBe(
      pathToFileURL(path.join(frameworkDir, 'src/index.js')).href,
    );
  });

  it('includes the manifest path when JSON parsing fails', async () => {
    const baseDir = createTempApp();
    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, 'not json{{{');

    const loader = new ManifestLoader({ baseDir, manifestPath, autoGenerate: false });

    await expect(loader.load()).rejects.toThrow(`invalid manifest JSON at ${manifestPath}`);
  });

  it('surfaces non-ENOENT manifest read errors', async () => {
    const baseDir = createTempApp();
    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    fs.mkdirSync(manifestPath, { recursive: true });

    const loader = new ManifestLoader({ baseDir, manifestPath, autoGenerate: false });

    await expect(loader.load()).rejects.toMatchObject({ code: 'EISDIR' });
  });

  it('surfaces malformed dependency package metadata during normalization', async () => {
    const baseDir = createTempApp();
    const badPackageDir = path.join(baseDir, 'node_modules/bad-json');
    fs.mkdirSync(badPackageDir, { recursive: true });
    writeJson(path.join(baseDir, 'package.json'), {
      dependencies: {
        'bad-json': '1.0.0',
      },
    });
    fs.writeFileSync(path.join(badPackageDir, 'package.json'), '{\n  "name": "bad-json",');
    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    writeJson(manifestPath, manifest());

    await expect(new ManifestLoader({ baseDir, manifestPath, autoGenerate: false }).load()).rejects.toThrow(
      `Invalid package config ${path.join(badPackageDir, 'package.json')}`,
    );
  });

  it('resolves package exports shorthand condition maps in key order for frameworkEntry', async () => {
    const { appDir, frameworkDir } = await loadFrameworkFixture({
      default: './src/index.js',
      import: './src/missing.js',
    });

    const loadedEntry = await fsp.readFile(path.join(appDir, 'framework-entry.txt'), 'utf-8');
    expect(loadedEntry).toBe(pathToFileURL(path.join(frameworkDir, 'src/index.js')).href);
  });

  it('ignores inactive package exports conditions for frameworkEntry', async () => {
    await expect(loadFrameworkFixture({ require: './src/index.js' })).rejects.toThrow(/has no resolvable entry/);
  });

  it('resolves nested package exports conditions for frameworkEntry', async () => {
    const { appDir, frameworkDir } = await loadFrameworkFixture({
      '.': {
        import: {
          default: './src/index.js',
        },
        default: './src/missing.js',
      },
    });

    const loadedEntry = await fsp.readFile(path.join(appDir, 'framework-entry.txt'), 'utf-8');
    expect(loadedEntry).toBe(pathToFileURL(path.join(frameworkDir, 'src/index.js')).href);
  });

  it('does not treat package exports subpath maps as root condition maps', async () => {
    const { appDir, frameworkDir } = await createFrameworkFixture({
      './feature': './src/index.js',
    });
    const loader = new ManifestLoader({
      baseDir: appDir,
      framework: frameworkDir,
      autoGenerate: true,
      env: 'prod',
      execArgv: [],
    });

    await expect(loader.load()).rejects.toThrow(/has no resolvable entry/);
  });

  it('resolves framework package roots when package.json is hidden by exports', async () => {
    const { appDir, frameworkDir } = await createInstalledFrameworkFixture();
    const loader = new ManifestLoader({
      baseDir: appDir,
      framework: 'fake-framework',
      autoGenerate: true,
      env: 'prod',
      execArgv: [],
    });

    await loader.load();

    const loadedEntry = await fsp.readFile(path.join(appDir, 'framework-entry.txt'), 'utf-8');
    expect(loadedEntry).toBe(pathToFileURL(path.join(frameworkDir, 'src/index.js')).href);
  });
});
