'use strict';

module.exports = app => {
  app.get('/', async function() {
    this.body = this.app.arg;
  })
};
