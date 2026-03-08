const assert = require("assert");

const TRACE_ID = Symbol("TRACE_ID");
const RPC_ID = Symbol("RPC_ID");

// Simple Tracer implementation
class Tracer {
  constructor(traceId, rpcId = "0") {
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
      (dispatch) => {
        const app = this.app;
        return async function tracerInterceptor(opts, handler) {
          const tracer = app.currentContext?.tracer;
          let traceId;
          let rpcId;

          try {
            if (tracer) {
              traceId = opts.headers[HTTP_HEADER_TRACE_ID_KEY] = tracer.traceId;
              rpcId = opts.headers[HTTP_HEADER_RPC_ID_KEY] = tracer.rpcIdPlus;
            }
          } catch (e) {
            e.message = "[egg-tracelog] set tracer header failed: " + e.message;
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
