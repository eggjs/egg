import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  manifestLoaderOptions: [] as unknown[],
  entryGeneratorOptions: [] as unknown[],
  manifestLoad: vi.fn(async () => undefined),
  externalsResolve: vi.fn(async () => ({})),
  entryGenerate: vi.fn(async () => ({
    entries: [{ name: 'worker', filepath: '/tmp/worker.entry.ts' }],
    entryDir: '/tmp',
  })),
}));

vi.mock('../src/lib/ManifestLoader.ts', () => ({
  ManifestLoader: vi.fn().mockImplementation(function (options: unknown) {
    mocks.manifestLoaderOptions.push(options);
    return {
      load: mocks.manifestLoad,
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
    return {
      resolve: mocks.externalsResolve,
    };
  }),
}));

vi.mock('../src/lib/EntryGenerator.ts', () => ({
  EntryGenerator: vi.fn().mockImplementation(function (options: unknown) {
    mocks.entryGeneratorOptions.push(options);
    return {
      generate: mocks.entryGenerate,
    };
  }),
}));

import { bundle } from '../src/index.ts';
import { SNAPSHOT_PRELUDE_MARKER } from '../src/lib/prelude.ts';

describe('Bundler', () => {
  let tmpApp: string;
  let tmpOutput: string;

  beforeEach(async () => {
    mocks.manifestLoaderOptions.length = 0;
    mocks.entryGeneratorOptions.length = 0;
    mocks.manifestLoad.mockClear();
    mocks.externalsResolve.mockClear();
    mocks.entryGenerate.mockClear();

    tmpApp = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-unit-app-'));
    tmpOutput = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-unit-out-'));
    await fs.writeFile(path.join(tmpApp, 'package.json'), JSON.stringify({ name: 'unit-app' }));
    // PackRunner writes the compiler tsconfig into the entry dir (= projectPath),
    // so it must be a real, writable directory under the app temp dir.
    const entryDir = path.join(tmpApp, '.egg-bundle', 'entries');
    mocks.entryGenerate.mockResolvedValue({
      entries: [{ name: 'worker', filepath: path.join(entryDir, 'worker.entry.ts') }],
      entryDir,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpApp, { recursive: true, force: true });
    await fs.rm(tmpOutput, { recursive: true, force: true });
  });

  it('opts ManifestLoader into auto-generation when bundling owns manifest loading', async () => {
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: {
        buildFunc: async () => {
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
        },
      },
    });

    expect(mocks.manifestLoaderOptions).toHaveLength(1);
    expect(mocks.manifestLoaderOptions[0]).toMatchObject({
      baseDir: tmpApp,
      framework: 'egg',
      autoGenerate: true,
    });
  });

  it('emits single-file output and prepends the snapshot prelude in snapshot mode', async () => {
    let packConfig: { output?: { type?: string }; entry?: unknown[] } | undefined;
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      snapshot: true,
      pack: {
        buildFunc: async (wrapped) => {
          packConfig = wrapped.config as typeof packConfig;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '((__UTOOPACK__)=>{})([]);\n');
        },
      },
    });

    // snapshot implies single-file: `export` output + per-entry library.
    expect(packConfig?.output?.type).toBe('export');
    expect(packConfig?.entry).toContainEqual(expect.objectContaining({ library: { name: 'app' } }));

    // prelude prepended before the bundle IIFE.
    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).toContain(SNAPSHOT_PRELUDE_MARKER);
    expect(worker.indexOf(SNAPSHOT_PRELUDE_MARKER)).toBeLessThan(worker.indexOf('__UTOOPACK__'));
  });

  it('packs and prepends snapshot preludes to both cluster worker entries', async () => {
    const entryDir = path.join(tmpApp, '.egg-bundle', 'entries');
    mocks.entryGenerate.mockResolvedValue({
      entries: [
        { name: 'app_worker', filepath: path.join(entryDir, 'app_worker.entry.ts') },
        { name: 'agent_worker', filepath: path.join(entryDir, 'agent_worker.entry.ts') },
      ],
      entryDir,
    });
    let packEntries: unknown[] | undefined;

    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      target: 'cluster',
      snapshot: true,
      pack: {
        buildFunc: async (wrapped) => {
          packEntries = (wrapped.config as { entry?: unknown[] }).entry;
          await Promise.all([
            fs.writeFile(path.join(tmpOutput, 'app_worker.js'), '((__UTOOPACK__)=>{})([]);\n'),
            fs.writeFile(path.join(tmpOutput, 'agent_worker.js'), '((__UTOOPACK__)=>{})([]);\n'),
          ]);
        },
      },
    });

    expect(packEntries).toEqual([
      expect.objectContaining({ name: 'app_worker', import: path.join(entryDir, 'app_worker.entry.ts') }),
      expect.objectContaining({ name: 'agent_worker', import: path.join(entryDir, 'agent_worker.entry.ts') }),
    ]);
    for (const filename of ['app_worker.js', 'agent_worker.js']) {
      const worker = await fs.readFile(path.join(tmpOutput, filename), 'utf8');
      expect(worker).toContain(SNAPSHOT_PRELUDE_MARKER);
    }
    expect(mocks.entryGeneratorOptions).toHaveLength(1);
    expect(mocks.entryGeneratorOptions[0]).toMatchObject({ target: 'cluster' });
  });

  it('skips the prelude when snapshot is disabled (single-file default unchanged)', async () => {
    let outputType: string | undefined;
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: {
        buildFunc: async (wrapped) => {
          outputType = (wrapped.config as { output?: { type?: string } }).output?.type;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '((__UTOOPACK__)=>{})([]);\n');
        },
      },
    });

    // single-file is the upstream default, so output stays `export` without snapshot.
    expect(outputType).toBe('export');
    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).not.toContain(SNAPSHOT_PRELUDE_MARKER);
  });

  it('honours pack.singleFile=false without snapshot (standalone, no prelude)', async () => {
    let outputType: string | undefined;
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: {
        singleFile: false,
        buildFunc: async (wrapped) => {
          outputType = (wrapped.config as { output?: { type?: string } }).output?.type;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// standalone\n');
        },
      },
    });

    expect(outputType).toBe('standalone');
    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).not.toContain(SNAPSHOT_PRELUDE_MARKER);
  });

  it('fails fast in snapshot mode when the pack build produced no worker.js', async () => {
    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        snapshot: true,
        pack: {
          // buildFunc intentionally writes nothing, simulating a broken pack output.
          buildFunc: async () => {},
        },
      }),
    ).rejects.toThrow(/expected bundle entry "worker\.js" was not found/);
  });

  it('forces single-file output in snapshot mode even when pack.singleFile=false', async () => {
    let outputType: string | undefined;
    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      snapshot: true,
      pack: {
        singleFile: false,
        buildFunc: async (wrapped) => {
          outputType = (wrapped.config as { output?: { type?: string } }).output?.type;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '((__UTOOPACK__)=>{})([]);\n');
        },
      },
    });

    // snapshot must override an explicit opt-out: V8 snapshots require single-file.
    expect(outputType).toBe('export');
    const worker = await fs.readFile(path.join(tmpOutput, 'worker.js'), 'utf8');
    expect(worker).toContain(SNAPSHOT_PRELUDE_MARKER);
  });

  it.each([
    ['absolute path', () => path.join(tmpApp, 'node_modules/custom-egg')],
    ['relative path', () => './custom-egg'],
    ['parent relative path', () => '../custom-egg'],
    ['file URL', () => 'file:///tmp/custom-egg'],
    ['Windows absolute path', () => 'C:\\custom-egg'],
    ['backslash path', () => 'custom\\egg'],
  ])('rejects %s framework values before generating bundle entries', async (_label, frameworkFactory) => {
    const framework = frameworkFactory();

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        framework,
        pack: {
          buildFunc: async () => {
            await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
          },
        },
      }),
    ).rejects.toThrow('framework must be a package specifier for bundled runtime');

    expect(mocks.manifestLoaderOptions).toHaveLength(0);
    expect(mocks.entryGenerate).not.toHaveBeenCalled();
  });

  it('passes application supplied pack resolve aliases into the pack build config', async () => {
    let packResolve: unknown;
    const alias = {
      'some-package': path.join(tmpApp, 'node_modules/some-package/index.js'),
    };

    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: {
        resolve: { alias },
        buildFunc: async (wrapped) => {
          packResolve = (wrapped.config as { resolve?: unknown }).resolve;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
        },
      },
    });

    expect(packResolve).toEqual({ alias });
  });

  it('loads pack resolve aliases from module.yml and resolves dot-relative targets from baseDir', async () => {
    let packResolve: unknown;
    await fs.writeFile(
      path.join(tmpApp, 'module.yml'),
      [
        'bundle:',
        '  pack:',
        '    resolve:',
        '      alias:',
        '        module-file: ./node_modules/module-file/index.js',
        '        package-style: package-style',
      ].join('\n'),
    );

    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: {
        buildFunc: async (wrapped) => {
          packResolve = (wrapped.config as { resolve?: unknown }).resolve;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
        },
      },
    });

    expect(packResolve).toEqual({
      alias: {
        'module-file': path.join(tmpApp, 'node_modules/module-file/index.js'),
        'package-style': 'package-style',
      },
    });
  });

  it('lets explicit pack resolve aliases override module.yml aliases', async () => {
    let packResolve: unknown;
    await fs.writeFile(
      path.join(tmpApp, 'module.yml'),
      [
        'bundle:',
        '  pack:',
        '    resolve:',
        '      alias:',
        '        shared: ./from-module.js',
        '        module-only: ./module-only.js',
      ].join('\n'),
    );

    await bundle({
      baseDir: tmpApp,
      outputDir: tmpOutput,
      pack: {
        resolve: {
          conditionNames: ['node'],
          alias: {
            shared: path.join(tmpApp, 'from-cli.js'),
            'cli-only': 'cli-only',
          },
        },
        buildFunc: async (wrapped) => {
          packResolve = (wrapped.config as { resolve?: unknown }).resolve;
          await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
        },
      },
    });

    expect(packResolve).toEqual({
      conditionNames: ['node'],
      alias: {
        shared: path.join(tmpApp, 'from-cli.js'),
        'module-only': path.join(tmpApp, 'module-only.js'),
        'cli-only': 'cli-only',
      },
    });
  });

  it('throws a clear error when module.yml bundle alias config is invalid', async () => {
    await fs.writeFile(
      path.join(tmpApp, 'module.yml'),
      ['bundle:', '  pack:', '    resolve:', '      alias:', '        invalid-target:', '          nested: true'].join(
        '\n',
      ),
    );

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        pack: {
          buildFunc: async () => {
            await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
          },
        },
      }),
    ).rejects.toThrow(/module\.yml bundle config load failed: .*bundle\.pack\.resolve\.alias\.invalid-target/);
  });

  it('throws a clear error when module.yml runtime asset force-copy dirs config is invalid', async () => {
    await fs.writeFile(
      path.join(tmpApp, 'module.yml'),
      ['bundle:', '  runtimeAssets:', '    forceCopyDirs:', '      - ../secret'].join('\n'),
    );

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        pack: {
          buildFunc: async () => {
            await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
          },
        },
      }),
    ).rejects.toThrow(/module\.yml bundle config load failed: .*bundle\.runtimeAssets\.forceCopyDirs/);
  });

  it('throws a clear error when module.yml runtime asset roots config is invalid', async () => {
    await fs.writeFile(
      path.join(tmpApp, 'module.yml'),
      ['bundle:', '  runtimeAssets:', '    roots:', '      - ../secret'].join('\n'),
    );

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        pack: {
          buildFunc: async () => {
            await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
          },
        },
      }),
    ).rejects.toThrow(/module\.yml bundle config load failed: .*bundle\.runtimeAssets\.roots/);
  });

  it('rejects prototype-polluting module.yml bundle alias specifiers', async () => {
    await fs.writeFile(
      path.join(tmpApp, 'module.yml'),
      ['bundle:', '  pack:', '    resolve:', '      alias:', '        constructor: ./polluted.js'].join('\n'),
    );

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        pack: {
          buildFunc: async () => {
            await fs.writeFile(path.join(tmpOutput, 'worker.js'), '// worker\n');
          },
        },
      }),
    ).rejects.toThrow(/module\.yml bundle config load failed: .*bundle\.pack\.resolve\.alias\.constructor/);
  });
});
