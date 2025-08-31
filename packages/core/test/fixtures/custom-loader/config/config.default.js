'use strict';

module.exports = {
  pkgName: 'custom_loader',
  customLoader: {
    adapter: {
      directory: 'app/adapter',
      inject: 'app',
    },
    util: {
      directory: 'app/util',
      inject: 'app',
    },
    repository: {
      directory: 'app/repository',
      inject: 'ctx',
    },
    plugin: {
      directory: 'app/plugin',
      inject: 'app',
      loadunit: true,
    },
  },
};
