'use strict';

module.exports = {
  keys: '123',
  customLoader: {
    adapter: {
      directory: 'app/adapter',
      inject: 'app',
    },
    repository: {
      directory: 'app/repository',
      inject: 'ctx',
    },
  },
};
