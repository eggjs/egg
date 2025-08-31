'use strict';

module.exports = app => {
  app.get('/router', app.middlewares.router(), controller);
  app.get('/static', controller);
  app.get('/match', controller);
  app.get('/common', controller);
  app.get('/', controller);
};

function controller() {
  this.body = 'hello';
}
