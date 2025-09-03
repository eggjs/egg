import test from 'node:test';
import assert from 'node:assert/strict';

// oxlint-disable-next-line no-namespace
import Koa, * as KoaModule from '../src/index.ts';

test('should export Koa class', t => {
  assert.equal(typeof Koa, 'function');
  t.assert.snapshot(Object.keys(Koa));
  t.assert.snapshot(Object.keys(KoaModule));
});
