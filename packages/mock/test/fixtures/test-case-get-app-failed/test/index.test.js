const { setGetAppCallback } = require('../../../..');

setGetAppCallback((suite, test) => {
  if (test) {
    throw new Error('mock get app failed');
  }
  return {
    ready: async () => {
      // ...
    },
    mockContextScope: async scope => {
      await scope({});
    },
    backgroundTasksFinished: async () => {
      // ...
    },
    close: async () => {
      // ...
    },
  };
});

describe('test case get app error', () => {
  it('should not print', () => {
  });
});
