'use strict';

export default {
  keys: 'keys',
  logger: {
    level: 'INFO',
  },
  redis: {
    clients: {
      session: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: '0',
      },
      cache: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: '1',
      },
    },
    agent: true,
  },
};
