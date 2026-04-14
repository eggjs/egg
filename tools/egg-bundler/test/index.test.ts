import { describe, it, expect } from 'vitest';

import { bundle, Bundler } from '../src/index.ts';

describe('@eggjs/egg-bundler', () => {
  it('exposes a Bundler class and a bundle() helper', () => {
    expect(typeof bundle).toBe('function');
    expect(typeof Bundler).toBe('function');
    expect(new Bundler({ baseDir: '/tmp', outputDir: '/tmp/out' })).toBeInstanceOf(Bundler);
  });

  // Full bundle() integration coverage lives in T12 (minimal-app fixture
  // end-to-end via test-expert). This file just pins the public surface.
});
