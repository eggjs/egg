import { test, expect } from 'vitest';

import * as egg from '../src/index.ts';

test('should expose properties', () => {
  expect(Object.keys(egg).sort()).toMatchSnapshot();

  expect(egg.Context).toBeDefined();
});
