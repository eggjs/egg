import { expect, test } from 'vitest';

import * as exports from '../src/transaction.ts';

test('should transaction exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
