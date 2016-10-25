'use strict';

const passport = require('koa-passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const WeiboStrategy = require('passport-weibo').Strategy;

module.exports = app => {
  app.use(passport.initialize());
  // FIXME: wait for egg-passport plugin to refactor
  app.use(passport.session());

  // add twitter oauth
  passport.use(new TwitterStrategy(app.config.passport.twitter, (token, tokenSecret, profile, done) => {
    app.logger.info('twitter oauth success: token: %s, tokenSecret: %s, profile: %s',
      token, tokenSecret, profile);
    // retrieve user ...
    done(null, profile);
  }));

  // add weibo oauth
  passport.use(new WeiboStrategy(app.config.passport.weibo, (token, tokenSecret, profile, done) => {
    app.logger.info('weibo oauth success: token: %s, tokenSecret: %s, profile: %s',
      token, tokenSecret, profile);
    // retrieve user ...
    done(null, profile);
  }));
  app.passport = passport;
};
