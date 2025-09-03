import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import context from '../test-helpers/context.ts';

describe('ctx.remove(name)', () => {
  it('should remove a field', () => {
    const ctx = context();
    ctx.set('x-foo', 'bar');
    ctx.remove('x-foo');
    assert.deepStrictEqual(ctx.response.header, {});
  });
});
