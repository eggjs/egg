const { setGetAppCallback } = require('../../../..');

setGetAppCallback(() => {
  return {
    ready: async () => {
      // ...
    },
    mockContextScope: async () => {
      throw new Error('mock create context failed');
    },
    close: async () => {
      // ...
    },
    backgroundTasksFinished: async () => {
      // ...
    },
  };
});

describe('test case create context error', () => {
  it('should not print', () => {
  });
});
