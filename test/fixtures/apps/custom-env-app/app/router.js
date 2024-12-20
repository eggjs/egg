'use strict';

module.exports = app => {
  app.get('/', async function() {
    this.body = {
      env: this.app.config.env,
    };
  });
};
