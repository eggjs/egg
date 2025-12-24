import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/standalone.ts';

test('should standalone exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
