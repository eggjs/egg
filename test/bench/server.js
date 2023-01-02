const http = require('http');
const path = require('path');
const mock = require('egg-mock');

const appName = process.argv[2];

const app = mock.app({
  baseDir: path.join(__dirname, appName),
  framework: path.join(__dirname, '../..'),
});

app.ready().then(() => {
  console.log('app(%s) ready', app.config.baseDir);

  const server = http.createServer(app.callback());
  // emit server event just like egg-cluster
  // https://github.com/eggjs/egg-cluster/blob/master/lib/app_worker.js#L52
  app.emit('server', server);

  server.listen(7001, () => {
    console.log('Server started at 7001');
  });
});

// see https://www.smashingmagazine.com/2018/06/nodejs-tools-techniques-performance-servers/
// $ clinic doctor --on-port 'autocannon http://localhost:7001' -- node server.js hello
// $ clinic flame --on-port 'autocannon http://localhost:7001' -- node server.js hello
