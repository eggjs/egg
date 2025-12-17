'use strict';

const { performance } = require('perf_hooks');
const { randomUUID } = require('crypto');

const FETCH = Symbol.for('EggApplication#fetch');
const SAFE_FETCH = Symbol.for('EggApplication#safeFetch');

module.exports = app => {
  app.beforeStart(async () => {
    if (!app.fetch) return; // Skip if fetch not available (Node.js < 20)
    
    // Store original functions
    const originalFetch = app[FETCH];
    const originalSafeFetch = app[SAFE_FETCH];
    
    if (!originalFetch || !originalSafeFetch) return;

    // Wrap fetch with tracer
    app[FETCH] = async function(url, init = {}) {
      const ctx = init.ctx;
      if (ctx && !init.tracer) {
        if (!ctx.traceId) {
          ctx.traceId = randomUUID();
        }
        init.tracer = {
          traceId: ctx.traceId,
        };
      } else if (!init.tracer) {
        init.tracer = {
          traceId: 'anonymous-' + randomUUID(),
        };
      }

      const starttime = performance.now();
      // Ensure headers object exists and properly set the trace header
      if (!init.headers) {
        init.headers = {};
      }
      // Handle Headers object or plain object
      if (typeof init.headers.set === 'function') {
        init.headers.set('x-request-id', init.tracer.traceId);
      } else {
        init.headers['x-request-id'] = init.tracer.traceId;
      }
      const method = init.method || 'GET';
      
      app.logger.info('[fetch] [%s] %s %s start', init.tracer.traceId, method, url);

      try {
        const response = await originalFetch(url, init);
        app.logger.info('[fetch] [%s] %s %s end, status: %s, use: %s',
          init.tracer.traceId, method, url,
          response.status, Math.floor((performance.now() - starttime) * 1000) / 1000);
        return response;
      } catch (err) {
        app.logger.error('[fetch] [%s] %s %s error: %s',
          init.tracer.traceId, method, url, err.message);
        throw err;
      }
    };

    // Wrap safeFetch with tracer
    app[SAFE_FETCH] = async function(url, init = {}) {
      const ctx = init.ctx;
      if (ctx && !init.tracer) {
        if (!ctx.traceId) {
          ctx.traceId = randomUUID();
        }
        init.tracer = {
          traceId: ctx.traceId,
        };
      } else if (!init.tracer) {
        init.tracer = {
          traceId: 'anonymous-' + randomUUID(),
        };
      }

      const starttime = performance.now();
      // Ensure headers object exists and properly set the trace header
      if (!init.headers) {
        init.headers = {};
      }
      // Handle Headers object or plain object
      if (typeof init.headers.set === 'function') {
        init.headers.set('x-request-id', init.tracer.traceId);
      } else {
        init.headers['x-request-id'] = init.tracer.traceId;
      }
      const method = init.method || 'GET';
      
      app.logger.info('[safeFetch] [%s] %s %s start', init.tracer.traceId, method, url);

      try {
        const response = await originalSafeFetch(url, init);
        app.logger.info('[safeFetch] [%s] %s %s end, status: %s, use: %s',
          init.tracer.traceId, method, url,
          response.status, Math.floor((performance.now() - starttime) * 1000) / 1000);
        return response;
      } catch (err) {
        app.logger.error('[safeFetch] [%s] %s %s error: %s',
          init.tracer.traceId, method, url, err.message);
        throw err;
      }
    };
  });
};
