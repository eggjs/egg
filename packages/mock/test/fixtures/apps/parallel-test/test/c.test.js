const assert = require('assert');

describe('test/parallel_a.test.js', () => {
  it('should work', () => {
    assert(!global.test);
  });
});
