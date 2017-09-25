'use strict';

module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/clusterPort', app.controller.home.getClusterPort);
  app.post('/publish', app.controller.home.publish);
  app.get('/getHosts', app.controller.home.getHosts);

  app.get('/getDefaultTimeout', function*() {
    this.body = yield app.apiClient.getResponseTimeout();
  });
  app.get('/getOverwriteTimeout', function*() {
    this.body = yield app.apiClient2.getResponseTimeout();
  });
};
