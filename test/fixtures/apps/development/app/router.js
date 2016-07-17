'use strict';

module.exports = app => {
  app.get('/foo.js', function* () {
    this.body = 'foo.js';
  });

  app.get('/foo', function* () {
    this.body = 'foo';
  });
};
