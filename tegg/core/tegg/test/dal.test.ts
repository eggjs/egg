import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/dal.ts';

test('should dal exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
