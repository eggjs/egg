const mm = require('../../../../../');
const assert = require('assert');

describe('test/parallel_b.test.js', () => {
  it('should work', () => {
    mm(global, 'test', '244');
    assert(global.test === '244');
  });
});
