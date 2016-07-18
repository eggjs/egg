'use strict';

module.exports = app => {
  app.get('/', function*() {
    this.logger.debug('hi %s %s', this.method, this.url);
    this.body = 'ok';
  });
};
