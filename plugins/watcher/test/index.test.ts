import { test, expect } from 'vitest';

import * as watcher from '../src/index.ts';

test('should exports work', async () => {
  expect(Object.keys(watcher).sort()).toMatchSnapshot();
});
