const { setGetAppCallback } = require('../../../..');

setGetAppCallback((suite, test) => {
  return {
    ready: async () => {
      // ...
    },
    mockContextScope: async scope => {
      if (!test) {
        await scope({});
      } else {
        throw new Error('mock create context failed');
      }
    },
    backgroundTasksFinished: async () => {
      // ...
    },
    close: async () => {
      // ...
    },
  };
});

describe('test case create context error', function() {
  it('should not print', () => {
  });
});
