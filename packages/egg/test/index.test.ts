import assert from 'node:assert/strict';

import { test, expect } from 'vitest';

import * as egg from '../src/index.ts';

test('should expose properties', () => {
  expect(egg).toMatchSnapshot();
  assert.ok(egg.Context);
  assert.strictEqual(egg.Config, Object);
  assert.strictEqual(egg.EggAppConfig, Object);
  assert.ok(egg.Logger);
});
