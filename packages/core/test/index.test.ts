import { strict as assert } from 'node:assert';

import { test, expect } from 'vitest';

import * as EggCore from '../src/index.ts';
import type { EggAppConfig } from '../src/index.ts';

test('should expose properties', () => {
  expect(Object.keys(EggCore).sort()).matchSnapshot();
});

test('should expose types', () => {
  const config = {
    coreMiddleware: [],
    middleware: [],
  } as EggAppConfig;
  assert(config.middleware);
  assert(config.coreMiddleware);
});
