exports.withKeyPaths = {
  inner: {
    key1: {
      nested: true,
    },
  },
  key2: 'str',
};

exports.dump = {
  ignoreKeyPaths: {
    'config.withKeyPaths.key2': true,
  },
};

exports.keys = 'test key';
