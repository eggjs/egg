'use strict';

module.exports = app => {
  app.get('/', 'home.show');
  app.get('/pathName', 'home.getPathName');
  app.get('/config', 'home.getConfig');
};
