import { expect, it } from 'vitest';
import * as types from '../src/index.js';

it('should export stable', async () => {
  expect(types).toMatchSnapshot();
});
