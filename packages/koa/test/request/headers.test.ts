import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { request } from '../test-helpers/context.ts';

describe('req.headers', () => {
  it('should return the request header object', () => {
    const req = request();
    assert.deepStrictEqual(req.headers, req.req.headers);
  });

  it('should set the request header object', () => {
    const req = request();
    req.headers = {
      'X-Custom-Headerfield': 'Its one header, with headerfields',
    };
    assert.deepStrictEqual(req.headers, req.req.headers);
  });
});
