const mm = require('../../../../../');
const assert = require('assert');

describe('test/parallel_a.test.js', () => {
  it('should work', () => {
    mm(global, 'test', '233');
    assert(global.test === '233');
  });
});
