import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, expectTypeOf, it } from 'vitest';

import * as bundler from '../src/index.js';
import { bundle, type BundleResult, type BundlerConfig } from '../src/index.js';

describe('@eggjs/egg-bundler', () => {
  it('exports the expected public API', () => {
    expect(Object.keys(bundler).sort()).toEqual(['ExternalsResolver', 'ManifestLoader', 'PackRunner', 'bundle']);
    expectTypeOf(bundle).toEqualTypeOf<(config: BundlerConfig) => Promise<BundleResult>>();
  });

  it('bundle() is a placeholder that throws until implemented', async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), 'egg-bundler-'));
    const outputDir = path.join(baseDir, 'out');

    try {
      await expect(bundle({ baseDir, outputDir })).rejects.toThrow(/not implemented/);
    } finally {
      await rm(baseDir, { force: true, recursive: true });
    }
  });
});
