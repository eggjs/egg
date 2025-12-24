import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/orm.ts';

test('should orm exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
