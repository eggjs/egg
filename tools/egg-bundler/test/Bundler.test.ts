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
});
