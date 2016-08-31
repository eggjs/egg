'use strict';

const util = require('../../../lib/core/util');

describe('test/lib/core/util.test.js', () => {
  describe('assign()', () => {
    it('should assign with object', () => {
      const a = { a: 0, c: 1 };
      const b = { a: 1, b: 1 };
      const c = util.assign(a, b);
      a.should.equal(c);
      c.should.eql({ a: 1, b: 1, c: 1 });
    });

    it('should assign with array', () => {
      const a = { a: 0, c: 0 };
      const b = [{ a: 1, b: 0 }, { b: 1, c: 1 }];
      const c = util.assign(a, b);
      a.should.equal(c);
      c.should.eql({ a: 1, b: 1, c: 1 });
    });

    it('should assign with empty', () => {
      const a = { a: 0, c: 0 };
      const b = [{ a: 1, b: 0 }, undefined ];
      const c = util.assign(a, b);
      a.should.equal(c);
      c.should.eql({ a: 1, b: 0, c: 0 });
    });
  });
});
