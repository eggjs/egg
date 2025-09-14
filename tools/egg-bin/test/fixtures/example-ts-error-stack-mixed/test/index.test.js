const assert = require('assert');

describe('test/index.test.js', () => {
  // placeholder comments
  it('should throw error', async () => {
    throw new Error('error');
  });

  // placeholder comments
  it('should assert', async () => {
    const obj = { key: '111' };
    assert.equal(obj.key, '222');
  });
});
