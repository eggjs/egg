'use strict';

module.exports = function(app) {
  app.get('/', app.controller.home);
  app.get('/traceClient', app.controller.trace.traceClient);

  app.get('/traceServer', app.controller.trace.traceServer);
};
