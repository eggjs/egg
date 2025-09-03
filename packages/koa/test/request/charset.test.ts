import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { request } from '../test-helpers/context.ts';

describe('req.charset', () => {
  describe('with no content-type present', () => {
    it('should return ""', () => {
      const req = request();
      assert.equal(req.charset, '');
    });
  });

  describe('with charset present', () => {
    it('should return ""', () => {
      const req = request();
      req.header['content-type'] = 'text/plain';
      assert.equal(req.charset, '');
    });
  });

  describe('with a charset', () => {
    it('should return the charset', () => {
      const req = request();
      req.header['content-type'] = 'text/plain; charset=utf-8';
      // oxlint-disable-next-line unicorn/text-encoding-identifier-case
      assert.equal(req.charset, 'utf-8');
    });

    it('should return "" if content-type is invalid', () => {
      const req = request();
      req.header['content-type'] =
        'application/json; application/text; charset=utf-8';
      assert.equal(req.charset, '');
    });
  });
});
