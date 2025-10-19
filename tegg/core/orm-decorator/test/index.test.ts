import { expect, it } from 'vitest';

import * as exports from '../src/index.ts';

it('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});
