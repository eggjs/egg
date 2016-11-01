'use strict';

module.exports = function(app) {
  app.get('/logger', function* () {
    this.getLogger('aLogger').info('aaa');
    this.body = 'done';
  });

  app.get('/noExistLogger', function* () {
    this.body = this.app.getLogger('noexist') + '';
  });
};
