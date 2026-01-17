import { expect, test } from 'vite-plus/test';

import * as exports from '../src/orm.ts';

test('should orm exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
