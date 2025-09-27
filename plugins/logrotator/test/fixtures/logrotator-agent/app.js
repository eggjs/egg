'use strict';

module.exports = function (app) {
  // won't find egg-agent from rotateLogDirs
  app.config.logger.rotateLogDirs = [];
};
