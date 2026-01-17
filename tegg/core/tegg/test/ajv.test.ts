import { expect, test } from 'vite-plus/test';

import * as exports from '../src/ajv.ts';

test('should ajv exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
