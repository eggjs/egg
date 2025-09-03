import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import util from 'node:util';

import context from '../test-helpers/context.ts';

describe('ctx.inspect()', () => {
  it('should return a json representation', () => {
    const ctx = context();
    const toJSON = ctx.toJSON();

    assert.deepStrictEqual(toJSON, ctx.inspect());
    assert.deepStrictEqual(util.inspect(toJSON), util.inspect(ctx));
  });
});
