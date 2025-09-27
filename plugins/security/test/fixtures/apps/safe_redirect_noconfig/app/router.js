'use strict';

module.exports = function (app) {
  app.get('/safe_redirect', app.controller.home.safeRedirect);
  app.get('/unsafe_redirect', app.controller.home.unSafeRedirect);
};
