'use strict';

exports.passport = {
  twitter: {
    consumerKey: 'Bs03m4guPuksRtIBuvntxw',
    consumerSecret: 'EwwTc3q4xEwxmm9OQnpy7cZdt43HYepeO8wdElGI',
    // FIXME: should add `app.port`
    callbackURL: 'http://localhost:' + (process.env.PORT || 7001) + '/auth/twitter/callback',
  },
};
