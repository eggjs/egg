import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import * as bundler from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should load entrypoint', () => {
    assert.deepEqual(Object.keys(bundler), []);
  });
});
