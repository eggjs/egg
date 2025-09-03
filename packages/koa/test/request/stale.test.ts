import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import context from '../test-helpers/context.ts';

describe('req.stale', () => {
  it('should be the inverse of req.fresh', () => {
    const ctx = context();
    ctx.status = 200;
    ctx.method = 'GET';
    ctx.req.headers['if-none-match'] = '"123"';
    ctx.set('ETag', '"123"');
    assert.strictEqual(ctx.fresh, true);
    assert.strictEqual(ctx.stale, false);
  });
});
