import { expect, test } from 'vite-plus/test';

import * as types from '../src/index.ts';

test('should export stable', async () => {
  expect(types).toMatchSnapshot();
});
