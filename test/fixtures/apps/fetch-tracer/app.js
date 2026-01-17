const assert = require('assert');
const { AsyncLocalStorage } = require('async_hooks');

const TRACE_ID = Symbol('TRACE_ID');
const RPC_ID = Symbol('RPC_ID');

// Simple Tracer implementation
class Tracer {
  constructor(traceId, rpcId = '0') {
    this.traceId = traceId;
    this._rpcId = rpcId;
    this._rpcIdSeq = 0;
  }

  get rpcId() {
    return this._rpcId;
  }

  get rpcIdPlus() {
    return `${this._rpcId}.${++this._rpcIdSeq}`;
  }
}

module.exports = class TracerApp {
  constructor(app) {
    this.app = app;
    assert(app.config);
    // Expose Tracer class for testing
    app.Tracer = Tracer;
    // Use AsyncLocalStorage for proper context isolation
    app.ctxStorage = new AsyncLocalStorage();
  }

  configWillLoad() {
    // Setup tracer interceptor using interceptors config
    this.app.config.httpclient = this.app.config.httpclient || {};
    if (!this.app.FetchFactory) {
      return;
    }
    const tracerConfig = this.app.config.tracer;
    const HTTP_HEADER_TRACE_ID_KEY = tracerConfig.HTTP_HEADER_TRACE_ID_KEY.toLowerCase();
    const HTTP_HEADER_RPC_ID_KEY = tracerConfig.HTTP_HEADER_RPC_ID_KEY.toLowerCase();

    this.app.config.httpclient.interceptors = [
      dispatch => {
        const app = this.app;
        return async function tracerInterceptor(opts, handler) {
          // Use AsyncLocalStorage to get context instead of global variable
          const ctx = app.ctxStorage.getStore() || app.currentContext;
          const tracer = ctx?.tracer;
          let traceId;
          let rpcId;

          function setHeader(key, value) {
            if (!opts.headers) {
              opts.headers = {};
            }
            const headers = opts.headers;
            if (typeof headers.set === 'function') {
              headers.set(key, value);
              return;
            }
            if (Array.isArray(headers)) {
              if (headers.length > 0 && Array.isArray(headers[0])) {
                headers.push([ key, value ]);
              } else {
                headers.push(key, value);
              }
              return;
            }
            headers[key] = value;
          }

          try {
            if (tracer) {
              traceId = tracer.traceId;
              setHeader(HTTP_HEADER_TRACE_ID_KEY, traceId);
              rpcId = tracer.rpcIdPlus;
              setHeader(HTTP_HEADER_RPC_ID_KEY, rpcId);
            }
          } catch (e) {
            e.message = '[egg-tracelog] set tracer header failed: ' + e.message;
            app.logger.warn(e);
          }

          try {
            return await dispatch(opts, handler);
          } finally {
            const opaque = handler.opaque;
            if (opaque) {
              opaque[TRACE_ID] = traceId;
              opaque[RPC_ID] = rpcId;
            }
          }
        };
      },
    ];
  }
};
