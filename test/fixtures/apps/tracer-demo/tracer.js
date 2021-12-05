'use strict';

const { performance } = require('perf_hooks');
const uuid = require('uuid');

module.exports = app => {
  app.httpclient.on('request', req => {
    if (!req.ctx) {
      // auto set anonymous context
      req.ctx = req.args.ctx = app.createAnonymousContext();
      req.ctx.traceId = 'anonymous-' + uuid.v1();
    }
    // set tracer id
    if (!req.ctx.traceId) {
      req.ctx.traceId = uuid.v1();
    }
    req.starttime = performance.now();
    req.args.headers = req.args.headers || {};
    req.args.headers['x-request-id'] = req.ctx.traceId;
    req.args.method = req.args.method || 'GET';
    app.logger.info('[httpclient] [%s] %s %s start',
      req.ctx.traceId, req.args.method, req.url);
  });

  app.httpclient.on('response', response => {
    const req = response.req;
    const res = response.res;
    app.logger.info('[httpclient] [%s] %s %s end, status: %s, use: %s',
      req.ctx.traceId, req.args.method, req.url,
      res.status, Math.floor((performance.now() - req.starttime) * 1000) / 1000);
  });
};
