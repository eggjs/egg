const assert = require('assert');

describe('test/index.test.ts', () => {
  describe('before error', () => {
    before(() => {
      throw new Error('before error');
    });

    it('should not print', () => {
      assert.fail('never arrive');
    });
  });

  describe('after error', () => {
    after(() => {
      throw new Error('after error');
    });

    it('should print', () => {
      console.log('after error test case should print');
    });
  });

  describe('beforeEach error', () => {
    beforeEach(() => {
      throw new Error('beforeEach error');
    });

    it('should not print', () => {
      assert.fail('never arrive');
    });
  });

  describe('afterEach error', () => {
    afterEach(() => {
      throw new Error('afterEach error');
    });

    it('should print', () => {
      console.log('afterEach error test case should print');
    });
  });

  describe('case error', () => {
    it('should failed', () => {
      assert.fail('should fail');
    });

    it('should work', () => {
      // ...
    });
  });
});
