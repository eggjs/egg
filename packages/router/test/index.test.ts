import { strict as assert } from 'node:assert';
import Router, { KoaRouter, EggRouter } from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should expose Router', () => {
    assert(typeof Router === 'function');
    assert(typeof KoaRouter === 'function');
    assert.equal(Router, KoaRouter);
    assert(typeof EggRouter === 'function');
  });
});
