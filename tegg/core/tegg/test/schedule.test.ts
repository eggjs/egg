import { expect, test } from 'vitest';

import * as exports from '../src/schedule.ts';

test('should schedule exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
