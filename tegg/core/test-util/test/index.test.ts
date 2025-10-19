import { expect, test } from 'vitest';

import * as types from '../src/index.ts';

test('should export stable', async () => {
  expect(types).toMatchSnapshot();
});
