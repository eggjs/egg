'use strict';

export default {
  keys: 'keys',
  logger: {
    level: 'INFO',
  },
  redis: {
    client: {
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: '0',
    },
    agent: true,
  },
};
