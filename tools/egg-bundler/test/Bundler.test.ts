import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  manifestLoaderOptions: [] as unknown[],
  manifestLoad: vi.fn(async () => undefined),
  externalsResolve: vi.fn(async () => ({})),
  entryGenerate: vi.fn(async () => ({ workerEntry: '/tmp/worker.entry.ts' })),
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
  EntryGenerator: vi.fn().mockImplementation(function () {
    return {
      generate: mocks.entryGenerate,
    };
  }),
}));

import { bundle } from '../src/index.ts';

describe('Bundler', () => {
  let tmpApp: string;
  let tmpOutput: string;

  beforeEach(async () => {
    mocks.manifestLoaderOptions.length = 0;
    mocks.manifestLoad.mockClear();
    mocks.externalsResolve.mockClear();
    mocks.entryGenerate.mockClear();

    tmpApp = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-unit-app-'));
    tmpOutput = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-unit-out-'));
    await fs.writeFile(path.join(tmpApp, 'package.json'), JSON.stringify({ name: 'unit-app' }));
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

  it('rejects absolute framework paths before generating bundle entries', async () => {
    const frameworkDir = path.join(tmpApp, 'node_modules/custom-egg');

    await expect(
      bundle({
        baseDir: tmpApp,
        outputDir: tmpOutput,
        framework: frameworkDir,
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
