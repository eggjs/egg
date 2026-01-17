import { test, expect } from 'vite-plus/test';

import * as exports from '../src/index.ts';

test('should exports keep stable', () => {
  expect(exports).toMatchSnapshot();
});
