'use strict';

module.exports = function(app) {
  app.messenger.on('egg-ready', () => {
    app.messenger.on('app-to-agent', function(msg) {
      console.log('[app] app-to-agent', msg);
    });
    app.messenger.on('agent-to-app', function(msg) {
      console.log('[app] agent-to-app', msg);
    });
    app.messenger.send('app-to-agent', 'app msg');
    app.messenger.send('pid', process.pid);
    app.messenger.send('ready');
  });
};
