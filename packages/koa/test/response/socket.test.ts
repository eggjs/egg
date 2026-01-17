import assert from 'node:assert/strict';
import Stream from 'node:stream';

import { describe, it } from 'vite-plus/test';

import { response } from '../test-helpers/context.ts';

describe('res.socket', () => {
  it('should return the request socket object', () => {
    const res = response();
    assert.strictEqual(res.socket instanceof Stream, true);
  });
});
