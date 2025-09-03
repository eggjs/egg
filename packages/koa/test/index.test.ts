import assert from 'node:assert/strict';
import { test, expect } from 'vitest';

// oxlint-disable-next-line no-namespace
import Koa, * as KoaModule from '../src/index.ts';

test('should export Koa class', () => {
  assert.equal(typeof Koa, 'function');
  expect(Object.keys(Koa)).toMatchSnapshot();
  expect(Object.keys(KoaModule)).toMatchSnapshot();
});
