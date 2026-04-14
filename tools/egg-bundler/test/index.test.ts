import { describe, expect, expectTypeOf, it } from 'vitest';

import { bundle, Bundler, type BundleResult, type BundlerConfig } from '../src/index.ts';

describe('@eggjs/egg-bundler', () => {
  it('exports bundle() with the expected public API signature', () => {
    expectTypeOf(bundle).toEqualTypeOf<(config: BundlerConfig) => Promise<BundleResult>>();
  });

  it('exposes a Bundler class and a bundle() helper', () => {
    expect(typeof bundle).toBe('function');
    expect(typeof Bundler).toBe('function');
    expect(new Bundler({ baseDir: '/tmp', outputDir: '/tmp/out' })).toBeInstanceOf(Bundler);
  });

  // Full bundle() integration coverage lives in T12 (minimal-app fixture
  // end-to-end via test-expert). This file just pins the public surface.
});
