'use strict';

module.exports = app => {
  app.get('/', function* () {
    this.body = this.app.serverEmit;
  });
};
