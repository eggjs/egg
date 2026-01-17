import { expect, test } from 'vite-plus/test';

import * as exports from '../src/dal.ts';

test('should dal exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
