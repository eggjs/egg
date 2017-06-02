'use strict';

const cp = require('child_process');
const sleep = require('mz-modules/sleep');
const findlinks = require('findlinks');
const assert = require('assert');

describe.only('test/doc.test.js', () => {

  let proc;
  before(function* () {
    proc = cp.fork(require.resolve('egg-doctools/bin/_doctools'), [ 'server' ]);
    yield sleep(10000);
  });
  after(() => proc.kill());

  it('should no broken url', function* () {
    const result = yield findlinks({ src: 'http://localhost:4000', logger: console });
    assert(result.fail === 0);
  });
});
