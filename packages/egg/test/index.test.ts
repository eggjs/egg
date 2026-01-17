import { test, expect } from 'vite-plus/test';

import * as egg from '../src/index.ts';

test('should expose properties', () => {
  expect(egg).toMatchSnapshot();
  expect(egg.Context).toBeDefined();
});
