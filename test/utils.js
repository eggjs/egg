'use strict';
require('egg-core/lib/utils/sequencify');
const m = require.cache[require.resolve('egg-core/lib/utils/sequencify')];
const seq = m.exports;
m.exports = function(...args) {
  const r = seq(...args);
  console.log(args, r);
  return r;
};

const fs = require('fs');
const path = require('path');
const http = require('http');
const mm = require('egg-mock');
const fixtures = path.join(__dirname, 'fixtures');
const eggPath = path.join(__dirname, '..');

exports.app = (name, options) => {
  options = formatOptions(name, options);
  const app = mm.app(options);
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
    localServer = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.statusCode = 200;
        if (req.url === '/get_headers') {
          res.setHeader('Content-Type', 'json');
          res.end(JSON.stringify(req.headers));
        } else if (req.url === '/timeout') {
          setTimeout(() => {
            res.end(`${req.method} ${req.url}`);
          }, 10000);
          return;
        } else {
          res.end(`${req.method} ${req.url}`);
        }
      });
    });

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
  return JSON.parse(fs.readFileSync(exports.getFilepath(name)));
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
