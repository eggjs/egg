import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import { TransformEnum } from '../src/index.js';

describe('core/ajv-decorator/test/TransformEnum.test.ts', () => {
  it('should get TransformEnum', () => {
    assert.equal(TransformEnum.trim, 'trim');
  });
});
