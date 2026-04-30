import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

    writeJson(path.join(baseDir, 'package.json'), {
      dependencies: {
        direct: '1.0.0',
      },
    });
    writeJson(path.join(directRoot, 'package.json'), {
      name: 'direct',
      version: '1.0.0',
      dependencies: {
        transitive: '1.0.0',
      },
    });
    writeJson(path.join(transitiveRoot, 'package.json'), {
      name: 'transitive',
      version: '1.0.0',
    });
    fs.mkdirSync(transitiveLib, { recursive: true });
    fs.writeFileSync(transitiveFile, 'export const value = 1;\n');

    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    writeJson(
      manifestPath,
      manifest({
        fileDiscovery: {
          [transitiveLib]: ['svc.ts'],
        },
        resolveCache: {
          [path.join(transitiveRoot, 'entry')]: transitiveFile,
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
      'node_modules/direct/node_modules/transitive/entry': 'node_modules/direct/node_modules/transitive/lib/svc.ts',
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

  it('includes the manifest path when JSON parsing fails', async () => {
    const baseDir = createTempApp();
    const manifestPath = path.join(baseDir, '.egg/manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, 'not json{{{');

    const loader = new ManifestLoader({ baseDir, manifestPath, autoGenerate: false });

    await expect(loader.load()).rejects.toThrow(`invalid manifest JSON at ${manifestPath}`);
  });
});
