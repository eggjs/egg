import { test, expect } from 'vitest';

import * as exports from '../src/index.ts';

test('export all should stable', () => {
  expect(exports).toMatchSnapshot();
});
