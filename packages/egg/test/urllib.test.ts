import { test, expect } from 'vite-plus/test';

import * as urllib from '../src/urllib.ts';

test('should expose properties', () => {
  expect(Object.keys(urllib).sort()).toMatchSnapshot();

  expect(typeof urllib.MockAgent).toBe('function');
});
