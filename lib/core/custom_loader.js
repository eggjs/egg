'use strict';

const assert = require('assert');
const path = require('path');

module.exports = loader => {
  const customLoader = loader.config.customLoader || {};

  for (const property of Object.keys(customLoader)) {
    const config = customLoader[property];
    assert(config.directory, `directory is required for config.customLoader.${property}`);

    const inject = config.inject;
    config.inject === null;

    switch (inject) {
      case 'ctx': {
        const directory = path.join(loader.config.baseDir, config.directory);
        delete config.inject;
        loader.loadToContext(directory, property, config);
        break;
      }
      case 'app': {
        const directory = path.join(loader.config.baseDir, config.directory);
        delete config.inject;
        loader.loadToApp(directory, property, config);
        break;
      }
      default:
    }
  }
};
