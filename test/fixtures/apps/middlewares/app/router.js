'use strict';

module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/traceClient', app.controller.trace.traceClient);

  app.get('/traceServer', app.controller.trace.traceServer);
  app.get('/error', app.controller.error);
};
