import { expect, test } from 'vitest';

import * as exports from '../src/ajv.ts';

test('should ajv exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
