import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { request } from '../test-helpers/context.ts';

describe('req.URL', () => {
  it('should not throw when host is void', () => {
    // Accessing the URL should not throw.
    assert.ok(request().URL);
  });

  it('should not throw when header.host is invalid', () => {
    const req = request();
    req.header.host = 'invalid host';
    // Accessing the URL should not throw.
    assert.ok(req.URL);
  });

  it('should return empty object when invalid', () => {
    const req = request();
    req.header.host = 'invalid host';
    assert.deepEqual(req.URL, Object.create(null));
  });
});
