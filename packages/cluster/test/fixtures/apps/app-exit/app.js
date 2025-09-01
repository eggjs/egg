'use strict';

module.exports = app => {
  app.messenger.on('egg-ready', () => {
    process.exit(1);
  });
};
