import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/transaction.ts';

test('should transaction exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
