import { expect, test } from 'vite-plus/test';

import * as exports from '../src/transaction.ts';

test('should transaction exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
