'use strict';

const path = require('path');

module.exports = loader => {
  const customLoader = loader.config.customLoader || {};

  for (const property of Object.keys(customLoader)) {
    const config = customLoader[property];
    switch (config.inject) {
      case 'ctx': {
        const directory = path.join(loader.config.baseDir, config.directory);
        loader.loadToContext(directory, property, config);
        break;
      }
      case 'app': {
        const directory = path.join(loader.config.baseDir, config.directory);
        loader.loadToApp(directory, property, config);
        break;
      }
      default:
    }
  }
}
