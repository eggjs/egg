import { expect, test } from 'vitest';

import * as exports from '../src/index.ts';

test('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});
