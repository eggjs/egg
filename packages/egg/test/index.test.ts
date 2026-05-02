import { test, expect } from 'vitest';

import * as egg from '../src/index.ts';

test('should expose properties', () => {
  expect(egg).toMatchSnapshot();
  expect(egg.Context).toBeDefined();
  expect(egg.EggAppConfig).toBe(Object);
  expect(egg.Logger).toBeDefined();
});
