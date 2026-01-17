import { test, expect } from 'vite-plus/test';

import * as exports from '../src/index.ts';

test('export all should stable', () => {
  expect(exports).toMatchSnapshot();
});
