import { test, expect } from '@voidzero-dev/vite-plus/test';

import * as egg from '../src/index.ts';

test('should expose properties', () => {
  expect(egg).toMatchSnapshot();
  expect(egg.Context).toBeDefined();
});
