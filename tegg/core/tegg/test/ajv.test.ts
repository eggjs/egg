import { expect, test } from '@voidzero-dev/vite-plus/test';

import * as exports from '../src/ajv.ts';

test('should ajv exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
