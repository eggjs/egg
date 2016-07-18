'use strict';

module.exports = function(app) {
  app.messenger.on('agent2app', data => console.log(data));
  app.messenger.on('app2app', data => console.log(data));

  app.messenger.once('egg-ready', () => {
    app.messenger.sendToApp('app2app', 'app2app');
    app.messenger.sendToAgent('app2agent', 'app2agent');
  });
};
