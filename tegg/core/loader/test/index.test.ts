import { expect, it } from '@voidzero-dev/vite-plus/test';

import * as types from '../src/index.js';

it('should export stable', async () => {
  expect(types).toMatchSnapshot();
});
