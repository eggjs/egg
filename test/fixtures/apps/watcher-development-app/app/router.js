const path = require('node:path');

const file_path1 = path.join(__dirname, '../tmp.txt');
const dir_path = path.join(__dirname, '../tmp');

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
