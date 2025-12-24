import { test, expect } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/index.ts';

test('should exports keep stable', () => {
  expect(exports).toMatchSnapshot();
});
