'use strict';

module.exports = {
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
