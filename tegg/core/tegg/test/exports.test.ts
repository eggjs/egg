import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/index.ts';

test('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});
