'use strict';

module.exports = app => {
  const asyncMiddlewares = [];

  for (let i = 0; i < 20; i++) {
    asyncMiddlewares.push(app.middlewares.async());
  }

  app.get('/', app.controller.home.index);
  app.get('/async', ...asyncMiddlewares, 'home.async');
};
