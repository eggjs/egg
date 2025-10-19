import { expect, test } from 'vitest';

import * as exports from '../src/dal.ts';

test('should dal exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
