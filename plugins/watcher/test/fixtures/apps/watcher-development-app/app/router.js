const path = require('node:path');

const file_path1 = path.join(__dirname, '../tmp.txt');
const dir_path = path.join(__dirname, '../tmp');

module.exports = function (app) {
  let fileChangeCount = 0;
  let hasDir = false;

  function callback(info) {
    console.log('got change %j', info);
    fileChangeCount++;
    if (info.isDirectory) {
      hasDir = true;
    }
  }

  app.get('/app-watch', async ctx => {
    app.watcher.watch([file_path1, dir_path], callback);
    ctx.body = 'app watch success';
  });

  app.get('/app-unwatch', async ctx => {
    app.watcher.unwatch([file_path1, dir_path], callback);
    ctx.body = 'app unwatch success';
  });

  app.get('/app-msg', async ctx => {
    ctx.body = fileChangeCount;
  });

  app.get('/app-hasDir', async ctx => {
    ctx.body = {
      hasDir,
    };
  });

  app.get('/agent-watch', async ctx => {
    app.messenger.broadcast('agent-watch');
    ctx.body = await new Promise(function (resolve) {
      app.messenger.on('agent-watch-success', function (msg) {
        resolve(msg);
      });
    });
  });

  app.get('/agent-unwatch', async ctx => {
    app.messenger.broadcast('agent-unwatch');
    ctx.body = await new Promise(function (resolve) {
      app.messenger.on('agent-unwatch-success', function (msg) {
        resolve(msg);
      });
    });
  });

  app.get('/agent-msg', async ctx => {
    app.messenger.broadcast('i-want-agent-file-changed-count');
    ctx.body = await new Promise(function (resolve) {
      app.messenger.on('agent-file-changed-count', function (msg) {
        resolve(msg);
      });
    });
  });
};
