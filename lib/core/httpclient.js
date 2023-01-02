const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const urllib = require('urllib');
const ms = require('humanize-ms');
const { FrameworkBaseError } = require('egg-errors');

class HttpClientError extends FrameworkBaseError {
  get module() {
    return 'httpclient';
  }
}

class HttpClient extends urllib.HttpClient2 {
  constructor(app) {
    normalizeConfig(app);
    const config = app.config.httpclient;
    super({
      app,
      defaultArgs: config.request,
      agent: new Agent(config.httpAgent),
      httpsAgent: new HttpsAgent(config.httpsAgent),
    });
    this.app = app;
  }

  async request(url, args) {
    args = args || {};
    if (args.ctx && args.ctx.tracer) {
      args.tracer = args.ctx.tracer;
    } else {
      args.tracer = args.tracer || this.app.tracer;
    }

    try {
      return await super.request(url, args);
    } catch (err) {
      if (err.code === 'ENETUNREACH') {
        throw HttpClientError.create(err.message, err.code);
      }
      throw err;
    }
  }

  async curl(...args) {
    return await this.request(...args);
  }
}

function normalizeConfig(app) {
  const config = app.config.httpclient;

  // compatibility
  if (typeof config.keepAlive === 'boolean') {
    config.httpAgent.keepAlive = config.keepAlive;
    config.httpsAgent.keepAlive = config.keepAlive;
  }
  if (config.timeout) {
    config.timeout = ms(config.timeout);
    config.httpAgent.timeout = config.timeout;
    config.httpsAgent.timeout = config.timeout;
  }
  // compatibility httpclient.freeSocketKeepAliveTimeout => httpclient.freeSocketTimeout
  if (config.freeSocketKeepAliveTimeout && !config.freeSocketTimeout) {
    config.freeSocketTimeout = config.freeSocketKeepAliveTimeout;
    delete config.freeSocketKeepAliveTimeout;
  }
  if (config.freeSocketTimeout) {
    config.freeSocketTimeout = ms(config.freeSocketTimeout);
    config.httpAgent.freeSocketTimeout = config.freeSocketTimeout;
    config.httpsAgent.freeSocketTimeout = config.freeSocketTimeout;
  } else {
    // compatibility agent.freeSocketKeepAliveTimeout
    if (config.httpAgent.freeSocketKeepAliveTimeout && !config.httpAgent.freeSocketTimeout) {
      config.httpAgent.freeSocketTimeout = config.httpAgent.freeSocketKeepAliveTimeout;
      delete config.httpAgent.freeSocketKeepAliveTimeout;
    }
    if (config.httpsAgent.freeSocketKeepAliveTimeout && !config.httpsAgent.freeSocketTimeout) {
      config.httpsAgent.freeSocketTimeout = config.httpsAgent.freeSocketKeepAliveTimeout;
      delete config.httpsAgent.freeSocketKeepAliveTimeout;
    }
  }

  if (typeof config.maxSockets === 'number') {
    config.httpAgent.maxSockets = config.maxSockets;
    config.httpsAgent.maxSockets = config.maxSockets;
  }
  if (typeof config.maxFreeSockets === 'number') {
    config.httpAgent.maxFreeSockets = config.maxFreeSockets;
    config.httpsAgent.maxFreeSockets = config.maxFreeSockets;
  }

  if (config.httpAgent.timeout < 30000) {
    app.coreLogger.warn('[egg:httpclient] config.httpclient.httpAgent.timeout(%s) can\'t below 30000, auto reset to 30000',
      config.httpAgent.timeout);
    config.httpAgent.timeout = 30000;
  }
  if (config.httpsAgent.timeout < 30000) {
    app.coreLogger.warn('[egg:httpclient] config.httpclient.httpsAgent.timeout(%s) can\'t below 30000, auto reset to 30000',
      config.httpsAgent.timeout);
    config.httpsAgent.timeout = 30000;
  }

  if (typeof config.request.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }
}

module.exports = HttpClient;
