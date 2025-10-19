import { expect, test } from 'vitest';

import * as exports from '../src/aop.ts';

test('should aop exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
