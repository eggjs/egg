import { expect, test } from 'vitest';

import * as exports from '../src/standalone.ts';

test('should standalone exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
