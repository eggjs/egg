import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/aop.ts';

test('should aop exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
