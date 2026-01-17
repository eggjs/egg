import { expect, test } from 'vite-plus/test';

import * as exports from '../src/index.ts';

test('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});
