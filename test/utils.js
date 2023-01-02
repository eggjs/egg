const { readFileSync } = require('fs');
const { rm } = require('fs/promises');
const path = require('path');
const mm = require('egg-mock');
const Koa = require('koa');
const http = require('http');
const request = require('supertest');
const egg = require('..');

const fixtures = path.join(__dirname, 'fixtures');
const eggPath = path.join(__dirname, '..');

exports.rimraf = async target => {
  await rm(target, { force: true, recursive: true });
};

exports.sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

exports.app = (name, options) => {
  options = formatOptions(name, options);
  const app = mm.app(options);
  return app;
};

/**
 * start app with single process mode
 *
 * @param {String} baseDir - base dir.
 * @param {Object} [options] - optional
 * @return {App} app - Application object.
 */
exports.singleProcessApp = async (baseDir, options = {}) => {
  if (!baseDir.startsWith('/')) baseDir = path.join(__dirname, 'fixtures', baseDir);
  options.env = options.env || 'unittest';
  options.baseDir = baseDir;
  const app = await egg.start(options);
  app.httpRequest = () => request(app.callback());
  return app;
};

/**
 * start app with cluster mode
 *
 * @param {String} name - cluster name.
 * @param {Object} [options] - optional
 * @return {App} app - Application object.
 */
exports.cluster = (name, options) => {
  options = formatOptions(name, options);
  return mm.cluster(options);
};

let localServer;

exports.startLocalServer = () => {
  return new Promise((resolve, reject) => {
    if (localServer) {
      return resolve('http://127.0.0.1:' + localServer.address().port);
    }
    let retry = false;

    const app = new Koa();
    app.use(async ctx => {
      if (ctx.path === '/get_headers') {
        ctx.body = ctx.request.headers;
        return;
      }

      if (ctx.path === '/timeout') {
        await exports.sleep(10000);
        ctx.body = `${ctx.method} ${ctx.path}`;
        return;
      }

      if (ctx.path === '/error') {
        ctx.status = 500;
        ctx.body = 'this is an error';
        return;
      }

      if (ctx.path === '/retry') {
        if (!retry) {
          retry = true;
          ctx.status = 500;
        } else {
          ctx.set('x-retry', '1');
          ctx.body = 'retry suc';
          retry = false;
        }
        return;
      }

      ctx.body = `${ctx.method} ${ctx.path}`;
    });
    localServer = http.createServer(app.callback());

    localServer.listen(0, err => {
      if (err) return reject(err);
      return resolve('http://127.0.0.1:' + localServer.address().port);
    });
  });
};
process.once('exit', () => localServer && localServer.close());

exports.getFilepath = name => {
  return path.join(fixtures, name);
};

exports.getJSON = name => {
  return JSON.parse(readFileSync(exports.getFilepath(name)));
};

function formatOptions(name, options) {
  let baseDir;
  if (typeof name === 'string') {
    baseDir = name;
  } else {
    // name is options
    options = name;
  }
  return Object.assign({}, {
    baseDir,
    customEgg: eggPath,
    cache: false,
  }, options);
}
