'use strict';

module.exports = app => {
  app.get('/agent-throw', function*() {
    app.messenger.broadcast('agent-throw');
    this.body = 'done';
  });
};
