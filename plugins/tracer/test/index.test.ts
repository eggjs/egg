import { strict as assert } from 'node:assert';
import { Tracer } from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should work with lib', () => {
    assert.equal(typeof Tracer, 'function');
  });
});
