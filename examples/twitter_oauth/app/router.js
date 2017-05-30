'use strict';

module.exports = app => {
  app.get('/', app.controller.home);

  // twitter oauth
  app.get('/auth/twitter', app.passport.authenticate('twitter'));
  app.get('/auth/twitter', app.passport.authenticate('twitter', {
    successRedirect: '/',
    failureRedirect: '/auth/error',
  }));
  app.get('/auth/error', app.controller.autherror);
};
