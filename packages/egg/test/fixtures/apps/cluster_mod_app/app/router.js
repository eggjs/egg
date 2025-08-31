'use strict';

module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/clusterPort', app.controller.home.getClusterPort);
  app.post('/publish', app.controller.home.publish);
  app.get('/getHosts', app.controller.home.getHosts);

  app.get('/getDefaultTimeout', async function(ctx) {
    ctx.body = await app.apiClient.getResponseTimeout();
  });
  app.get('/getOverwriteTimeout', async function(ctx) {
    ctx.body = await app.apiClient2.getResponseTimeout();
  });
};
