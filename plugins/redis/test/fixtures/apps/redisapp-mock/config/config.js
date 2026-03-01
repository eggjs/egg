const RedisMock = require('ioredis-mock');

exports.redis = {
  Redis: RedisMock,
  client: {
    host: '127.0.0.1',
    port: 6379,
    password: '',
    db: 0,
    weakDependent: true,
  },
};

exports.logger = {
  coreLogger: {
    level: 'INFO',
  },
};

exports.keys = 'keys';
