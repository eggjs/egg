'use strict';

module.exports = app => {
  app.get('/', app.controller.home.index);
  app.get('/clusterPort', app.controller.home.getClusterPort);
  app.post('/publish', app.controller.home.publish);
  app.get('/getHosts', app.controller.home.getHosts);
};
