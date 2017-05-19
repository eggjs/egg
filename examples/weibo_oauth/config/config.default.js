'use strict';

exports.passport = {
  weibo: {
    clientID: 'your-consumer-key',
    clientSecret: 'your-secret',
    // FIXME: should add `app.port`
    callbackURL: 'http://localhost:' + (process.env.PORT || 7001) + '/auth/weibo/callback',
  },
};
