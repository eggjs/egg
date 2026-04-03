import { expect, it } from 'vitest';

import * as exports from '../src/index.ts';

it('should export stable', async () => {
  // Verify egg's own exports are present (don't snapshot upstream typebox
  // exports which change with every minor version)
  expect(exports.TransformEnum).toBeDefined();
  expect(exports.AjvInvalidParamError).toBeDefined();
  // Verify typebox re-export works
  expect(exports.Type).toBeDefined();
});
