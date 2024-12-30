'use strict';

const utils = require('../../../../utils');
const file_path1 = utils.getFilepath('apps/watcher-development-app/tmp.txt');
// const file_path2 = utils.getFilePath('apps/watcher-development-app/tmp/tmp.txt');
const dir_path = utils.getFilepath('apps/watcher-development-app/tmp');

module.exports = function(app) {
  let fileChangeCount = 0;

  function callback(a) {
    fileChangeCount++;
  }

  app.get('/app-watch', async function() {
    app.watcher.watch([file_path1, dir_path], callback);
    this.body = 'app watch success';
  });

  app.get('/app-msg', async function() {
    this.body = fileChangeCount;
  });

  app.get('/agent-watch', async function() {
    app.messenger.broadcast('agent-watch');
    this.body = await new Promise(function(resolve) {
      app.messenger.on('agent-watch-success', function(msg) {
        resolve(msg);
      });
    });
  });

  app.get('/agent-msg', async function() {
    app.messenger.broadcast('i-want-agent-file-changed-count');
    this.body = await new Promise(function(resolve) {
      app.messenger.on('agent-file-changed-count', function(msg) {
        resolve(msg);
      });
    });
  });
};
