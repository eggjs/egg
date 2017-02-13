'use strict';

const sleep = require('ko-sleep');


module.exports = app => {
  app.get('/', function*() {
    this.logger.debug('hi %s %s', this.method, this.url);
    // wait for writing to file
    yield sleep(1000);
    this.body = 'ok';
  });
};
