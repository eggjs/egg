'use strict';

const fs = require('fs');
const path = require('path');
const mm = require('egg-mock');
const fixtures = path.join(__dirname, 'fixtures');
const eggPath = path.join(__dirname, '..');

exports.app = (name, options) => {
  options = formatOptions(name, options);
  return mm.app(options);
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

exports.getFilepath = name => {
  return path.join(fixtures, name);
};

exports.getJSON = name => {
  return JSON.parse(fs.readFileSync(exports.getFilepath(name)));
};

// context helper, come from https://github.com/koajs/koa/blob/master/test/context.js
exports.createContext = (ctx, cb) => {
  const app = exports.app('apps/demo');
  return new Promise(function(resolve, reject) {
    app.ready(() => {
      const mockCtx = app.mockContext(ctx);
      if (cb) cb(mockCtx);
      resolve(mockCtx);
    });

    app.on('error', err => {
      reject(err);
    });
  });
};

exports.createRequest = function(ctx, cb) {
  return new Promise(function(resolve, reject) {
    exports.createContext(ctx).then(mockCtx => {
      const req = mockCtx.request;
      if (cb) cb(req);
      resolve(req);
    }, err => {
      reject(err);
    });
  });
};

exports.createResponse = function(ctx, cb) {
  return new Promise(function(resolve, reject) {
    exports.createContext(ctx).then(mockCtx => {
      const res = mockCtx.response;
      if (cb) cb(res);
      resolve(res);
    }, err => {
      reject(err);
    });
  });
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
