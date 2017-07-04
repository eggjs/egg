'use strict';

module.exports = app => {
  app.get('/test', function* () {
    this.app.locals.foo = 'bar';
    this.locals.abc = '123';
    this.body = {
      locals: this.locals,
    };
  });
};
