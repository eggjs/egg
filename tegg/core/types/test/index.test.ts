import { expect, it } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/index.ts';

it('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});
