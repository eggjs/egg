import { expect, test } from 'vitest';

import * as exports from '../src/orm.ts';

test('should orm exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
