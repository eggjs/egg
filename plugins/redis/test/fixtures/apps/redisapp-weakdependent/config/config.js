exports.redis = {
  client: {
    weakDependent: true,
    host: '127.0.0.1',
    port: 6379,
    password: '',
    db: '0',
  },
  agent: true,
};

exports.logger = {
  coreLogger: {
    level: 'INFO',
  },
};

exports.keys = 'keys';
