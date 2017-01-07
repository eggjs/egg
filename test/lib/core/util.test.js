'use strict';

const mm = require('mm');
const net = require('net');
const assert = require('assert');
const util = require('../../../lib/core/util');
const startCluster = require('../../../lib/cluster');
const EventEmitter = require('events').EventEmitter;

describe('test/lib/core/util.test.js', () => {
  afterEach(mm.restore);

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

  describe('getFreePort', () => {
    it('should get a free port ok', done => {
      util.getFreePort((err, port) => {
        assert.ifError(err);
        assert(typeof port === 'number');
        done();
      });
    });

    it('should get a error if failed', done => {
      mm(net, 'createServer', () => {
        return Object.create(EventEmitter.prototype, {
          unref: { value: () => {} },
          listen: {
            value() {
              this.emit('error', new Error('mock err'));
            },
          },
        });
      });
      startCluster({}, err => {
        assert(err && err.message === 'mock err');
        done();
      });
    });
  });
});
