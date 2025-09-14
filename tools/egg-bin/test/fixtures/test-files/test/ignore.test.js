const assert = require('assert');
const a = require('../ignore/a');

describe('ignore.test.js', () => {
  it('should success', () => {
    assert(a === '');
  });
});
