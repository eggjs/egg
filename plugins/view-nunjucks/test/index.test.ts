import { test, expect } from 'vitest';

import * as exports from '../src/index.ts';

test('should exports keep stable', () => {
  expect(exports).toMatchSnapshot();
});
