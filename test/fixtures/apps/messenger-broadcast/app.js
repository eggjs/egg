'use strict';

module.exports = function(app) {
  app.messenger.on('egg-ready', () => {
    app.messenger.broadcast('broadcast', {
      from: 'app',
      pid: process.pid,
    });
  });

  app.messenger.on('broadcast', info => {
    console.log('app %s receive message from %s pid %s', process.pid, info.from, info.pid);
  });
};
