import { expect, test } from 'vitest';

import * as exports from '../src/ajv.ts';

test('should ajv exports stable', async () => {
  // Verify egg's own exports are present (don't snapshot upstream typebox
  // exports which change with every minor version)
  expect(exports.TransformEnum).toBeDefined();
  expect(exports.AjvInvalidParamError).toBeDefined();
  // Verify typebox re-export works
  expect(exports.Type).toBeDefined();
});
