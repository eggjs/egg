'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const mm = require('egg-mock');
const fixtures = path.join(__dirname, 'fixtures');
const eggPath = path.join(__dirname, '..');
const egg = require('..');
const request = require('supertest');

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
