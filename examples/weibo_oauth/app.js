'use strict';

const passport = require('koa-passport');
const WeiboStrategy = require('passport-weibo').Strategy;

module.exports = app => {
  app.use(passport.initialize());
  // FIXME: wait for egg-passport plugin to refactor
  app.use(passport.session());
  // Passport session setup.
  // To support persistent login sessions, Passport needs to be able to
  // serialize users into and deserialize users out of the session.  Typically,
  // this will be as simple as storing the user ID when serializing, and finding
  // the user by ID when deserializing.  However, since this example does not
  // have a database of user records, the complete Weibo profile is serialized
  // and deserialized.
  passport.serializeUser((user, done) => {
    done(null, {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar_hd,
    });
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  // add weibo oauth
  passport.use(new WeiboStrategy(app.config.passport.weibo, (accessToken, refreshToken, profile, done) => {
    app.logger.info('weibo oauth success: accessToken: %s, refreshToken: %s, profile: %j',
      accessToken, refreshToken, profile);
    // retrieve user ...
    done(null, profile);
  }));
  app.passport = passport;
};
