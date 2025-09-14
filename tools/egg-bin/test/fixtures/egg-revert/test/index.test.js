const assert = require('assert');

describe('test/index.test.js', () => {
  it('should test', () => {
    // test
    assert(process.execArgv.includes('--security-revert=CVE-2023-46809'));
  });
});
