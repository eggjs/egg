'use strict';

exports.passport = {
  twitter: {
    consumerKey: 'your-consumer-key',
    consumerSecret: 'your-secret',
    // FIXME: should add `app.port`
    callbackURL: 'http://localhost:' + (process.env.PORT || 7001) + '/auth/twitter/callback',
  },
  weibo: {
    consumerKey: 'your-consumer-key',
    consumerSecret: 'your-secret',
    // FIXME: should add `app.port`
    callbackURL: 'http://localhost:' + (process.env.PORT || 7001) + '/auth/twitter/callback',
  },
};
