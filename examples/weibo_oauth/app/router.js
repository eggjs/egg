'use strict';

module.exports = app => {
  app.get('/', app.controller.home);

  // twitter oauth
  app.get('/auth/weibo', app.passport.authenticate('weibo'));
  app.get('/auth/weibo/callback', app.passport.authenticate('weibo', {
    successRedirect: '/',
    failureRedirect: '/auth/error',
  }));
  app.get('/auth/error', app.controller.autherror);
};
