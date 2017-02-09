'use strict';

module.exports = app => {
  app.get('/api', app.middlewares.router(), 'api.index');
};
