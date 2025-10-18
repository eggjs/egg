import assert from 'node:assert/strict';

import { Orm, LeoricRegister } from '../src/index.ts';

describe('plugin/orm/exports.test.ts', () => {
  it('should export Orm', () => {
    assert.ok(Orm);
    assert.ok(LeoricRegister);
  });
});
