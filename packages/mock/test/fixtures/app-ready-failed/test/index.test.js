const assert = require('assert');
const { app } = require('../../../../dist/commonjs/bootstrap');

describe('test for app ready failed', () => {
  it('should not print', () => {
    // ...
    assert(app);
  });
});
