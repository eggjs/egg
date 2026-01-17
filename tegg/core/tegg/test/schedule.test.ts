import { expect, test } from 'vite-plus/test';

import * as exports from '../src/schedule.ts';

test('should schedule exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
