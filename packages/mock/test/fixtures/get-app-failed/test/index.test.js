const { setGetAppCallback } = require('../../../..');

setGetAppCallback(() => {
  throw new Error('mock get app failed');
});

describe('test case create context error', () => {
  it('should not print', () => {
  });
});
