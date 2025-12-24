import { test, expect } from '@voidzero-dev/vite-plus/test';

import * as watcher from '../src/index.ts';

test('should exports work', async () => {
  expect(Object.keys(watcher).sort()).toMatchSnapshot();
});
