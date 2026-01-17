import { expect, it } from 'vite-plus/test';

import * as exports from '../src/index.ts';

it('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});
