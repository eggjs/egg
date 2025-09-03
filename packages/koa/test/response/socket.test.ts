import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Stream from 'node:stream';

import { response } from '../test-helpers/context.ts';

describe('res.socket', () => {
  it('should return the request socket object', () => {
    const res = response();
    assert.strictEqual(res.socket instanceof Stream, true);
  });
});
